using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using StockPilot.API.Data;
using StockPilot.API.Interfaces;
using StockPilot.API.Middleware;
using StockPilot.API.Services;
using StockPilot.Application;
using StockPilot.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// ── Database Configuration ───────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
{
    var cs = builder.Configuration.GetConnectionString("DefaultConnection");
    var useInMemory = (bool.TryParse(builder.Configuration["UseInMemoryDatabase"], out var inMem) && inMem) ||
                      string.Equals(Environment.GetEnvironmentVariable("USE_IN_MEMORY"), "true", StringComparison.OrdinalIgnoreCase);
    if (useInMemory || string.IsNullOrWhiteSpace(cs))
    {
        options.UseInMemoryDatabase("StockPilotAppDb");
    }
    else
    {
        options.UseNpgsql(cs);
    }
});

// Clean Architecture layers (Sales & Demand, Agentic AI, Persistence)
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

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

builder.Services.AddAuthorization();

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

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var devEmail = builder.Configuration["DevAuth:Email"] ?? "dev@stockpilot.local";
    if (!db.Users.Any(u => u.Email == devEmail))
    {
        db.Users.Add(new StockPilot.API.Entities.User
        {
            UserId = Guid.NewGuid(),
            Email = devEmail,
            FullName = "StockPilot Developer",
            Role = "BusinessOwner",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });
        db.SaveChanges();
    }
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
}

app.Run();

// Needed for WebApplicationFactory in integration tests
public partial class Program { }
