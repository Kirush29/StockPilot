using StockPilot.Shared.Identity;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Microsoft.SemanticKernel;
using StockPilot.API.Authorization;
using StockPilot.API.Middleware;
using StockPilot.Application;
using StockPilot.Infrastructure;
using StockPilot.Procurement.Application;
using StockPilot.Procurement.Application.Abstractions;
using StockPilot.Procurement.Application.Services;
using StockPilot.Procurement.Infrastructure;
using StockPilot.Shared.Data;

var builder = WebApplication.CreateBuilder(args);

// ── Database Configuration ───────────────────────────────────────────────────
// One connection string for the shared database: DATABASE_URL (URL form, e.g. from a host) wins, else
// ConnectionStrings:DefaultConnection. Same resolution the Procurement module used.
var defaultConnection = StockPilot.Procurement.Infrastructure.DependencyInjection.ResolveConnectionString(builder.Configuration);
var hasValidConnectionString = !string.IsNullOrWhiteSpace(defaultConnection)
    && !defaultConnection.Contains("See appsettings", StringComparison.OrdinalIgnoreCase)
    && !defaultConnection.Contains("environment variable", StringComparison.OrdinalIgnoreCase);

var useInMemory = !hasValidConnectionString ||
                  (bool.TryParse(builder.Configuration["UseInMemoryDatabase"], out var inMem) && inMem) ||
                  string.Equals(Environment.GetEnvironmentVariable("USE_IN_MEMORY"), "true", StringComparison.OrdinalIgnoreCase);

// ── Clean Architecture layers (Sales & Demand, Agentic AI, Persistence) ─────
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// ── Procurement module ────────────────────────────────────────────────────────
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, HttpCurrentUserService>();
builder.Services.AddProcurementApplication(builder.Configuration);
builder.Services.AddProcurementInfrastructure(builder.Configuration);
// Procurement's cross-module contracts served by the real Inventory and Supplier modules (plan §2.1 step 5),
// replacing its in-memory stand-ins. Receiving a purchase order creates an Inventory batch (decision D14).
builder.Services.Replace(ServiceDescriptor.Scoped<IProductCatalogService, StockPilot.Shared.Integration.InventoryProductCatalogAdapter>());
builder.Services.Replace(ServiceDescriptor.Scoped<IBranchDirectoryService, StockPilot.Shared.Integration.InventoryBranchDirectoryAdapter>());
builder.Services.Replace(ServiceDescriptor.Scoped<ISupplierDirectoryService, StockPilot.Shared.Integration.SupplierDirectoryAdapter>());
builder.Services.Replace(ServiceDescriptor.Scoped<IInventoryStockUpdater, StockPilot.Shared.Integration.InventoryStockReceivingAdapter>());

// ── Multi-agent Replenishment Orchestrator (plan §2.4): connects the four agents, adds no reasoning of its own ──
builder.Services.AddSingleton<StockPilot.Shared.Agents.Orchestrator.IAgentContractValidator, StockPilot.Shared.Agents.Orchestrator.EmbeddedAgentContractValidator>();
builder.Services.AddScoped<StockPilot.Shared.Agents.Orchestrator.IReplenishmentOrchestrator, StockPilot.Shared.Agents.Orchestrator.ReplenishmentOrchestrator>();
builder.Services.AddSingleton<IAuthorizationHandler, ProcurementApprovalHandler>();

// ── Inventory & Supplier module (src/StockPilot.Domain/Application/Infrastructure) ──
// ── Shared persistence (D2): one AppDbContext, one migration history, all four modules ──
builder.Services.AddPlatformPersistence(defaultConnection, useInMemory);
builder.Services.AddScoped<StockPilot.Application.Interfaces.ISupplierRepository, StockPilot.Infrastructure.Repositories.SupplierRepository>();
builder.Services.AddScoped<StockPilot.Application.Services.ISupplierService, StockPilot.Application.Services.SupplierService>();
builder.Services.AddScoped<StockPilot.Application.Interfaces.IQuotationRepository, StockPilot.Infrastructure.Repositories.QuotationRepository>();
builder.Services.AddScoped<StockPilot.Application.Services.IQuotationService, StockPilot.Application.Services.QuotationService>();
builder.Services.AddScoped<StockPilot.Application.Interfaces.IProductRepository, StockPilot.Infrastructure.Repositories.ProductRepository>();
builder.Services.AddScoped<StockPilot.Application.Services.IProductService, StockPilot.Application.Services.ProductService>();
builder.Services.AddScoped<StockPilot.Application.Services.ISupplierEvaluationService, StockPilot.Application.Services.SupplierEvaluationService>();
builder.Services.Configure<StockPilot.Application.Models.AgenticAiSettings>(builder.Configuration.GetSection("AgenticAi"));
// Integration: the Supplier Evaluation agent's WorkingDirectory is relative, and the bridge resolves it against the
// process's current directory, which differs between `dotnet run`, the E2E script (bin/) and IDE launches. Pin it to
// the repository's agentic-ai folder when the configured path doesn't point at it.
builder.Services.PostConfigure<StockPilot.Application.Models.AgenticAiSettings>(settings =>
{
    static bool IsAgentFolder(string path) => File.Exists(Path.Combine(path, "agents", "supplier_evaluation", "__main__.py"));

    if (IsAgentFolder(Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), settings.WorkingDirectory))))
        return;

    foreach (var start in new[] { builder.Environment.ContentRootPath, AppContext.BaseDirectory })
    {
        for (var dir = new DirectoryInfo(start); dir is not null; dir = dir.Parent)
        {
            var candidate = Path.Combine(dir.FullName, "agentic-ai");
            if (IsAgentFolder(candidate))
            {
                settings.WorkingDirectory = candidate;
                return;
            }
        }
    }
});
builder.Services.AddScoped<StockPilot.Application.Interfaces.IAgenticAiIntegrationService, StockPilot.Infrastructure.Services.AgenticAiIntegrationService>();
builder.Services.AddScoped<StockPilot.Application.Interfaces.IProductService, StockPilot.Infrastructure.Services.ProductService>(); // Student 1 (api/products); Student 3's IProductService serves api/supplier-products
builder.Services.AddScoped<StockPilot.Application.Interfaces.IBranchService, StockPilot.Infrastructure.Services.BranchService>();
builder.Services.AddScoped<StockPilot.Application.Interfaces.IBatchService, StockPilot.Infrastructure.Services.BatchService>();
builder.Services.AddScoped<StockPilot.Application.Interfaces.ICategoryService, StockPilot.Infrastructure.Services.CategoryService>();
builder.Services.AddScoped<StockPilot.Application.Interfaces.IInventoryService, StockPilot.Infrastructure.Services.InventoryService>();
builder.Services.AddScoped<StockPilot.Application.Interfaces.IInventoryOptimizationService, StockPilot.Infrastructure.Services.InventoryOptimizationService>();
builder.Services.AddScoped<StockPilot.Application.Interfaces.IStockMovementService, StockPilot.Infrastructure.Services.StockMovementService>();
builder.Services.AddScoped<StockPilot.Application.Interfaces.ITransferService, StockPilot.Infrastructure.Services.TransferService>();
builder.Services.AddScoped<StockPilot.Application.Interfaces.IUserService, StockPilot.Infrastructure.Services.UserService>();
builder.Services.AddScoped<StockPilot.Application.Interfaces.ICurrentUserService, StockPilot.Api.Services.CurrentUserService>();
builder.Services.Configure<StockPilot.Api.Configuration.EmailSettings>(
    builder.Configuration.GetSection(StockPilot.Api.Configuration.EmailSettings.SectionName));
if (builder.Configuration.GetValue($"{StockPilot.Api.Configuration.EmailSettings.SectionName}:UseFakeProvider", true))
    builder.Services.AddScoped<StockPilot.Application.Interfaces.IEmailNotificationService, StockPilot.Api.Services.FakeEmailNotificationService>();
else
    builder.Services.AddScoped<StockPilot.Application.Interfaces.IEmailNotificationService, StockPilot.Api.Services.SmtpEmailNotificationService>();

// ── AI & Semantic Kernel ──────────────────────────────────────────────────────
var geminiKey = builder.Configuration["Gemini:ApiKey"] 
    ?? builder.Configuration["GEMINI_API_KEY"] 
    ?? builder.Configuration["GOOGLE_API_KEY"]
    ?? (string.Equals(builder.Configuration["AGENT_MODEL_PROVIDER"], "gemini", StringComparison.OrdinalIgnoreCase) ? builder.Configuration["AGENT_MODEL_API_KEY"] : null);

var openAiKey = builder.Configuration["OpenAI:ApiKey"] 
    ?? builder.Configuration["OPENAI_API_KEY"]
    ?? (string.Equals(builder.Configuration["AGENT_MODEL_PROVIDER"], "openai", StringComparison.OrdinalIgnoreCase) ? builder.Configuration["AGENT_MODEL_API_KEY"] : null);

if (!string.IsNullOrEmpty(geminiKey))
{
    var modelId = builder.Configuration["Gemini:ModelId"] ?? builder.Configuration["GEMINI_MODEL"] ?? "gemini-2.5-flash";
    var skBuilder = builder.Services.AddKernel();
    skBuilder.AddOpenAIChatCompletion(
        modelId: modelId,
        endpoint: new Uri("https://generativelanguage.googleapis.com/v1beta/openai/"),
        apiKey: geminiKey
    );
}
else if (!string.IsNullOrEmpty(openAiKey))
{
    var modelId = builder.Configuration["OpenAI:ModelId"] ?? builder.Configuration["OPENAI_MODEL"] ?? "gpt-4o-mini";
    var skBuilder = builder.Services.AddKernel();
    skBuilder.AddOpenAIChatCompletion(
        modelId: modelId,
        apiKey: openAiKey
    );
}

// ── Fail fast on missing/short JWT signing key ────────────────────────────────
var jwtSigningKey = builder.Configuration["Jwt:SigningKey"];
if (string.IsNullOrWhiteSpace(jwtSigningKey) || jwtSigningKey.Length < 32)
{
    throw new InvalidOperationException("Configuration 'Jwt:SigningKey' must be set and be at least 32 characters long.");
}

// ── Identity: one JWT setup and one set of role policies for every module (Shared/Identity) ──
builder.Services.AddStockPilotIdentity(builder.Configuration);

builder.Services.AddExceptionHandler<ProcurementExceptionHandler>();
builder.Services.AddProblemDetails();

// ── Web API Services & Controllers ───────────────────────────────────────────
builder.Services.AddControllers();
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

// ── CORS Configuration ────────────────────────────────────────────────────────
var rawOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
if (rawOrigins == null || rawOrigins.Length == 0)
{
    var rawString = builder.Configuration["Cors:AllowedOrigins"];
    if (!string.IsNullOrWhiteSpace(rawString))
    {
        rawOrigins = rawString.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }
}

string[] defaultDevOrigins =
[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
];

var allowedOrigins = (rawOrigins != null && rawOrigins.Length > 0)
    ? rawOrigins
    : (builder.Environment.IsDevelopment() ? defaultDevOrigins : Array.Empty<string>());

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowStockPilotClients", policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials();
        }
        else
        {
            policy.AllowAnyMethod()
                  .AllowAnyHeader();
        }
    });
    options.AddDefaultPolicy(policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials();
        }
        else
        {
            policy.AllowAnyMethod()
                  .AllowAnyHeader();
        }
    });
});

var app = builder.Build();

app.UseMiddleware<ExceptionMiddleware>();
app.UseExceptionHandler();

// The Inventory & Supplier controllers rely on their module's own exception mapping (ForbiddenException -> 403 etc.).
// Scoped to their routes so Procurement exceptions still reach ProcurementExceptionHandler.
string[] inventoryAndSupplierRoutes =
[
    "/api/Auth", "/api/batches", "/api/branches", "/api/categories", "/api/inventory", "/api/optimization",
    "/api/Products", "/api/stock-movements", "/api/transfers", "/api/Users",
    "/api/Suppliers", "/api/Quotations", "/api/SupplierEvaluation"
];
app.UseWhen(
    ctx => inventoryAndSupplierRoutes.Any(r => ctx.Request.Path.StartsWithSegments(r, StringComparison.OrdinalIgnoreCase)),
    branch => branch.UseMiddleware<StockPilot.Api.Middlewares.ExceptionHandlingMiddleware>());

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowStockPilotClients");
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new
{
    status = "Healthy",
    service = "StockPilot.Api",
    timestamp = DateTime.UtcNow,
    component = "Sales & Demand and Inventory Integration Ready",
    databaseProvider = useInMemory ? "InMemory" : "PostgreSQL"
}));

app.MapControllers();

// Ensure database tables are provisioned and seed initial data
using (var scope = app.Services.CreateScope())
{
    var platformDb = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (useInMemory)
        await platformDb.Database.EnsureCreatedAsync();
    else
        await platformDb.Database.MigrateAsync();
    await StockPilot.Infrastructure.Persistence.Seed.SalesDataSeeder.SeedAsync(platformDb);

    if (app.Environment.IsDevelopment())
    {
        SeedDevAccounts(platformDb);
        await PlatformDemoDataSeeder.SeedAsync(platformDb);
    }
}

app.Run();

static void SeedDevAccounts(StockPilot.Infrastructure.Data.StockPilotDbContext db)
{
    var hasher = new Microsoft.AspNetCore.Identity.PasswordHasher<StockPilot.Domain.Entities.User>();

    var devAccounts = new[]
    {
        new { Email = "business@stockpilot.local", Role = "BusinessOwner", Name = "StockPilot Business Owner", Username = "business" },
        new { Email = "procurement@stockpilot.local", Role = "ProcurementManager", Name = "StockPilot Procurement", Username = "procurement" },
        new { Email = "branch@stockpilot.local", Role = "BranchManager", Name = "StockPilot Branch Mgr", Username = "branch" },
        new { Email = "employee@stockpilot.local", Role = "StoreEmployee", Name = "StockPilot Employee", Username = "employee" }
    };

    var colomboBranchId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    var kandyBranchId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    if (!db.Branches.Any(b => b.BranchId == colomboBranchId))
    {
        db.Branches.Add(new StockPilot.Domain.Entities.Branch { BranchId = colomboBranchId, BranchCode = "COL-01", Name = "Colombo Central Branch" });
    }
    if (!db.Branches.Any(b => b.BranchId == kandyBranchId))
    {
        db.Branches.Add(new StockPilot.Domain.Entities.Branch { BranchId = kandyBranchId, BranchCode = "KAN-01", Name = "Kandy City Branch" });
    }
    db.SaveChanges();

    foreach (var account in devAccounts)
    {
        if (!db.Users.Any(u => u.Email == account.Email))
        {
            var user = new StockPilot.Domain.Entities.User
            {
                UserId = Guid.NewGuid(),
                Username = account.Username,
                Email = account.Email,
                FullName = account.Name,
                Role = account.Role,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                BranchId = (account.Role == "BranchManager" || account.Role == "StoreEmployee") ? kandyBranchId : null
            };

            user.PasswordHash = hasher.HashPassword(user, "DevPassword123!");
            db.Users.Add(user);
        }
    }
    db.SaveChanges();
}

// Needed for WebApplicationFactory in integration tests
public partial class Program { }
