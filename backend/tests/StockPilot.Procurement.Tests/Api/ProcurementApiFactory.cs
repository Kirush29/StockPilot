using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.IdentityModel.Tokens;

using StockPilot.Shared.Data;
using StockPilot.Procurement.Application.Abstractions;
using StockPilot.Procurement.Infrastructure.ExternalStubs;

namespace StockPilot.Procurement.Tests.Api;

/// <summary>
/// Hosts the real StockPilot API (routing, JWT auth, role policies, exception handler) over
/// the shared in-memory database, private to this factory instance so tests don't share state.
/// </summary>
public class ProcurementApiFactory : WebApplicationFactory<Program>
{
    // Must match Jwt settings in StockPilot.API/appsettings.json.
    private const string SigningKey = "StockPilotSuperSecretDevelopmentKeyForJWTValidation2026";
    private const string Issuer = "StockPilot";
    private const string Audience = "StockPilotClients";

    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly string _suffix = Guid.NewGuid().ToString("N");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("UseInMemoryDatabase", "true");
        builder.ConfigureTestServices(services =>
        {
            Replace<AppDbContext>(services, $"platform-{_suffix}");

            // These tests are written against the Procurement module's own stand-in data (SeedIds).
            // The running API uses adapters over the real Inventory/Supplier tables instead.
            services.Replace(ServiceDescriptor.Singleton<IProductCatalogService, InMemoryProductCatalogService>());
            services.Replace(ServiceDescriptor.Singleton<ISupplierDirectoryService, InMemorySupplierDirectoryService>());
            services.Replace(ServiceDescriptor.Singleton<IBranchDirectoryService, InMemoryBranchDirectoryService>());
            services.Replace(ServiceDescriptor.Singleton<IInventoryStockUpdater, NoOpInventoryStockUpdater>());
        });
    }

    private static void Replace<TContext>(IServiceCollection services, string databaseName) where TContext : DbContext
    {
        services.RemoveAll<DbContextOptions<TContext>>();
        services.AddDbContext<TContext>(options => options.UseInMemoryDatabase(databaseName));
    }

    /// <summary>A client authenticated as a user with the given role (or anonymous when role is null).</summary>
    public HttpClient ClientAs(string? role, Guid? userId = null)
    {
        var client = CreateClient();
        if (role is not null)
        {
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", Token(role, userId ?? Guid.NewGuid()));
        }

        return client;
    }

    public static string Token(string role, Guid userId)
    {
        var credentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(SigningKey)), SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            Issuer,
            Audience,
            [new Claim(ClaimTypes.NameIdentifier, userId.ToString()), new Claim(ClaimTypes.Role, role)],
            expires: DateTime.UtcNow.AddMinutes(30),
            signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public static class HttpTestExtensions
{
    public static async Task<JsonElement> ReadJsonAsync(this HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>(ProcurementApiFactory.Json);
}
