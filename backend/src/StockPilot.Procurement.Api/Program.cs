using System.Reflection;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using StockPilot.Procurement.Api.Authorization;
using StockPilot.Procurement.Api.Middleware;
using StockPilot.Procurement.Application;
using StockPilot.Procurement.Application.Abstractions;
using StockPilot.Procurement.Infrastructure;
using StockPilot.Procurement.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, HttpCurrentUserService>();

builder.Services.AddProcurementApplication(builder.Configuration);
builder.Services.AddProcurementInfrastructure(builder.Configuration);

// --- Authentication: validates JWTs issued by the shared Identity module ---
var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? builder.Configuration["Jwt:Issuer"]
    ?? throw new InvalidOperationException("JWT issuer is not configured (JWT_ISSUER env var or Jwt:Issuer).");
var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? builder.Configuration["Jwt:Audience"]
    ?? throw new InvalidOperationException("JWT audience is not configured (JWT_AUDIENCE env var or Jwt:Audience).");
var jwtSigningKey = Environment.GetEnvironmentVariable("JWT_SIGNING_KEY") ?? builder.Configuration["Jwt:SigningKey"]
    ?? throw new InvalidOperationException("JWT signing key is not configured (JWT_SIGNING_KEY env var or Jwt:SigningKey).");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSigningKey))
        };
    });

// --- Authorization: role-based via [Authorize(Roles=...)], plus the amount-aware approval policy ---
builder.Services.AddSingleton<IAuthorizationHandler, ProcurementApprovalHandler>();
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("CanApproveProcurement", policy => policy.Requirements.Add(new ProcurementApprovalRequirement()));
});

// --- CORS: only the configured StockPilot React/Flutter clients may call this API ---
var allowedOrigins = builder.Configuration.GetSection("Procurement:Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy("StockPilotClients", policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod());
});

builder.Services.AddExceptionHandler<ProcurementExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "StockPilot Procurement API",
        Version = "v1",
        Description = "Procurement Proposals, Approval Decisions, Purchase Orders and Budgets for the StockPilot procurement module."
    });

    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Paste a JWT issued by the StockPilot Identity module (\"Bearer {token}\" is added automatically)."
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            []
        }
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ProcurementDbContext>();
    db.Database.Migrate();
}

app.UseExceptionHandler();

app.UseHttpsRedirection();

app.UseCors("StockPilotClients");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

/// <summary>Entry point class, exposed so WebApplicationFactory-based integration tests can reference the assembly.</summary>
public partial class Program;
