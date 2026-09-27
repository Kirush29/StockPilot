using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using StockPilot.Application.Interfaces;
using StockPilot.Application.Services;
using StockPilot.Infrastructure.Data;
using StockPilot.Infrastructure.Repositories;
using StockPilot.Application.Models;
using StockPilot.Infrastructure.Services;
using StockPilot.Api.Services;
using StockPilot.Api.Middlewares;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<StockPilotDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<ISupplierRepository, SupplierRepository>();
builder.Services.AddScoped<ISupplierService, SupplierService>();
builder.Services.AddScoped<IQuotationRepository, QuotationRepository>();
builder.Services.AddScoped<IQuotationService, QuotationService>();
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<ISupplierEvaluationService, SupplierEvaluationService>();
builder.Services.AddScoped<IBranchService, BranchService>();
builder.Services.AddScoped<IBatchService, BatchService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IInventoryOptimizationService, InventoryOptimizationService>();
builder.Services.AddScoped<IStockMovementService, StockMovementService>();
builder.Services.AddScoped<ITransferService, TransferService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

var jwtKey = builder.Configuration["Jwt:SigningKey"]
          ?? builder.Configuration["Jwt:Key"]
          ?? "super_secret_key_that_should_be_long_enough_for_hmacsha256";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("InventoryRead", policy =>
        policy.RequireRole("BusinessOwner", "ProcurementManager", "BranchManager", "StoreEmployee"));
    options.AddPolicy("InventoryManage", policy =>
        policy.RequireRole("BusinessOwner", "ProcurementManager", "BranchManager", "StoreEmployee"));
    options.AddPolicy("BranchManage", policy =>
        policy.RequireRole("BusinessOwner"));
    options.AddPolicy("TransferCreate", policy =>
        policy.RequireRole("BusinessOwner", "BranchManager", "StoreEmployee"));
    options.AddPolicy("TransferApprove", policy =>
        policy.RequireRole("BusinessOwner", "ProcurementManager", "BranchManager"));
    options.AddPolicy("TransferShip", policy =>
        policy.RequireRole("BusinessOwner", "BranchManager", "StoreEmployee"));
    options.AddPolicy("TransferReceive", policy =>
        policy.RequireRole("BusinessOwner", "BranchManager", "StoreEmployee"));
    options.AddPolicy("AiAnalyze", policy =>
        policy.RequireRole("BusinessOwner", "ProcurementManager", "BranchManager"));
    options.AddPolicy("AiReview", policy =>
        policy.RequireRole("BusinessOwner", "ProcurementManager", "BranchManager"));
    options.AddPolicy("UserManage", policy =>
        policy.RequireRole("BusinessOwner"));
    options.AddPolicy("ProcurementManage", policy =>
        policy.RequireRole("BusinessOwner", "ProcurementManager"));
});

builder.Services.Configure<AgenticAiSettings>(
    builder.Configuration.GetSection("AgenticAi"));
builder.Services.AddScoped<IAgenticAiIntegrationService, AgenticAiIntegrationService>();

builder.Services.Configure<StockPilot.Api.Configuration.EmailSettings>(
    builder.Configuration.GetSection(StockPilot.Api.Configuration.EmailSettings.SectionName));

var useFakeEmail = builder.Configuration.GetValue<bool>($"{StockPilot.Api.Configuration.EmailSettings.SectionName}:UseFakeProvider", true);
if (useFakeEmail)
{
    builder.Services.AddScoped<IEmailNotificationService, FakeEmailNotificationService>();
}
else
{
    builder.Services.AddScoped<IEmailNotificationService, SmtpEmailNotificationService>();
}

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "StockPilot API",
        Version = "v1"
    });
});

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

bool autoMigrate = builder.Configuration.GetValue<bool>("Database:AutoMigrate", false);
if (autoMigrate && app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<StockPilotDbContext>();
    dbContext.Database.Migrate();

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

    if (!dbContext.Branches.Any(b => b.BranchId == colomboBranchId))
    {
        dbContext.Branches.Add(new StockPilot.Domain.Entities.Branch { BranchId = colomboBranchId, BranchCode = "COL-01", Name = "Colombo Central Branch" });
    }
    if (!dbContext.Branches.Any(b => b.BranchId == kandyBranchId))
    {
        dbContext.Branches.Add(new StockPilot.Domain.Entities.Branch { BranchId = kandyBranchId, BranchCode = "KAN-01", Name = "Kandy City Branch" });
    }
    dbContext.SaveChanges();

    foreach (var account in devAccounts)
    {
        if (!dbContext.Users.Any(u => u.Email == account.Email))
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
            dbContext.Users.Add(user);
        }
    }
    dbContext.SaveChanges();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
