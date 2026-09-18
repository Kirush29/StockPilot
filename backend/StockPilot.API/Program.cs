using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using StockPilot.API.Authorization;
using StockPilot.API.Data;
using StockPilot.API.Interfaces;
using StockPilot.API.Middleware;
using StockPilot.API.Services;
using StockPilot.Application;
using StockPilot.Infrastructure;
using StockPilot.Procurement.Application;
using StockPilot.Procurement.Application.Abstractions;
using StockPilot.Procurement.Application.Services;
using StockPilot.Procurement.Infrastructure;
using StockPilot.Procurement.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// ── Database Configuration ───────────────────────────────────────────────────
var defaultConnection = builder.Configuration.GetConnectionString("DefaultConnection");
var hasValidConnectionString = !string.IsNullOrWhiteSpace(defaultConnection)
    && !defaultConnection.Contains("See appsettings", StringComparison.OrdinalIgnoreCase)
    && !defaultConnection.Contains("environment variable", StringComparison.OrdinalIgnoreCase);

var useInMemory = !hasValidConnectionString ||
                  (bool.TryParse(builder.Configuration["UseInMemoryDatabase"], out var inMem) && inMem) ||
                  string.Equals(Environment.GetEnvironmentVariable("USE_IN_MEMORY"), "true", StringComparison.OrdinalIgnoreCase);

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (useInMemory)
    {
        options.UseInMemoryDatabase("StockPilotAppDb");
    }
    else
    {
        options.UseNpgsql(defaultConnection);
    }
});

// Clean Architecture layers (Sales & Demand, Agentic AI, Persistence)
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// Procurement module (proposals, approvals, purchase orders, budgets)
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, HttpCurrentUserService>();
builder.Services.AddProcurementApplication(builder.Configuration);
builder.Services.AddProcurementInfrastructure(builder.Configuration);
builder.Services.AddSingleton<IAuthorizationHandler, ProcurementApprovalHandler>();

// ── Inventory Management Services ────────────────────────────────────────────
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IBatchService, BatchService>();
builder.Services.AddScoped<IStockMovementService, StockMovementService>();
builder.Services.AddScoped<ITransferService, TransferService>();

// ── JWT Authentication ────────────────────────────────────────────────────────
var jwtSection = builder.Configuration.GetSection("Jwt");
var signingKey = jwtSection["SigningKey"] ?? "StockPilotSuperSecretDevelopmentKeyForJWTValidation2026";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSection["Issuer"] ?? "StockPilot",
            ValidAudience = jwtSection["Audience"] ?? "StockPilotClients",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey))
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("CanApproveProcurement", policy => policy.Requirements.Add(new ProcurementApprovalRequirement()));
});

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
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowStockPilotClients", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

app.UseMiddleware<ExceptionMiddleware>();
app.UseExceptionHandler();

// Configure the HTTP request pipeline.
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
    component = "Sales & Demand and Inventory Integration Ready"
}));

app.MapControllers();

// Ensure database tables are provisioned and seed initial Sales & Demand demo data
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<StockPilot.Infrastructure.Persistence.StockPilotDbContext>();
    await dbContext.Database.EnsureCreatedAsync();
    await StockPilot.Infrastructure.Persistence.Seed.SalesDataSeeder.SeedAsync(dbContext);

    var procurementDb = scope.ServiceProvider.GetRequiredService<ProcurementDbContext>();
    if (useInMemory)
    {
        await procurementDb.Database.EnsureCreatedAsync();
    }
    else
    {
        await procurementDb.Database.MigrateAsync();
    }
}

app.Run();

// Needed for WebApplicationFactory in integration tests
public partial class Program { }
