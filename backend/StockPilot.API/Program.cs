using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Microsoft.SemanticKernel;
using StockPilot.API.Data;
using StockPilot.API.Interfaces;
using StockPilot.API.Middleware;
using StockPilot.API.Services;

var builder = WebApplication.CreateBuilder(args);

// ── Database ─────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── JWT Authentication ────────────────────────────────────────────────────────
// AUTH-INTEGRATION-POINT: The auth team should replace or extend this configuration.
// This wires up JWT validation so [Authorize] attributes work on Inventory endpoints.
var jwtSection = builder.Configuration.GetSection("Jwt");
var signingKey = jwtSection["SigningKey"]
    ?? throw new InvalidOperationException("JWT SigningKey is not configured.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidAudience = jwtSection["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey))
        };
    });

builder.Services.AddAuthorization();

// ── Inventory Management Services ────────────────────────────────────────────
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IBatchService, BatchService>();
builder.Services.AddScoped<IStockMovementService, StockMovementService>();
builder.Services.AddScoped<ITransferService, TransferService>();
builder.Services.AddScoped<IInventoryOptimizationService, InventoryOptimizationService>();

// ── AI & Semantic Kernel ──────────────────────────────────────────────────────
var openAiKey = builder.Configuration["OpenAI:ApiKey"];
if (!string.IsNullOrEmpty(openAiKey))
{
    var skBuilder = builder.Services.AddKernel();
    skBuilder.AddOpenAIChatCompletion(
        modelId: "gpt-4o-mini", // Or whatever model you prefer
        apiKey: openAiKey
    );
}

builder.Services.AddControllers();

// ── Swagger ───────────────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "StockPilot API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

// ── CORS (dev permissive — tighten for production) ────────────────────────────
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();

app.UseMiddleware<ExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    var devAccounts = new[]
    {
        new { Email = "business@stockpilot.local", Role = "BusinessOwner", Name = "StockPilot Business Owner" },
        new { Email = "procurement@stockpilot.local", Role = "ProcurementManager", Name = "StockPilot Procurement" },
        new { Email = "branch@stockpilot.local", Role = "BranchManager", Name = "StockPilot Branch Mgr" },
        new { Email = "employee@stockpilot.local", Role = "StoreEmployee", Name = "StockPilot Employee" }
    };

    foreach (var account in devAccounts)
    {
        if (!db.Users.Any(u => u.Email == account.Email))
        {
            db.Users.Add(new StockPilot.API.Entities.User
            {
                UserId = Guid.NewGuid(),
                Email = account.Email,
                FullName = account.Name,
                Role = account.Role,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }
    }
    db.SaveChanges();
}

app.UseCors();
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

// Needed for WebApplicationFactory in integration tests
public partial class Program { }
