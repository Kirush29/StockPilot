using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using StockPilot.API.Authorization;

namespace StockPilot.Shared.Identity;

/// <summary>
/// The one authentication and authorization setup every module uses: JWT bearer tokens issued by the Inventory
/// module's AuthController (POST /api/auth/login), the four platform roles, and every module's named policies.
/// Values are unchanged from the former inline setup in Program.cs.
/// </summary>
public static class StockPilotIdentity
{
    public static class Roles
    {
        public const string BusinessOwner = nameof(BusinessOwner);
        public const string ProcurementManager = nameof(ProcurementManager);
        public const string BranchManager = nameof(BranchManager);
        public const string StoreEmployee = nameof(StoreEmployee);
    }

    public static IServiceCollection AddStockPilotIdentity(this IServiceCollection services, IConfiguration configuration)
    {
        var jwtSection = configuration.GetSection("Jwt");
        var signingKey = jwtSection["SigningKey"] ?? "StockPilotSuperSecretDevelopmentKeyForJWTValidation2026";

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
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

        services.AddAuthorization(options =>
        {
            // Procurement module (Student 4): approval-limit requirement, handled by ProcurementApprovalHandler.
            options.AddPolicy("CanApproveProcurement", policy => policy.Requirements.Add(new ProcurementApprovalRequirement()));

            // Inventory module (Student 1) policies
            options.AddPolicy("InventoryRead", policy => policy.RequireRole(Roles.BusinessOwner, Roles.ProcurementManager, Roles.BranchManager, Roles.StoreEmployee));
            options.AddPolicy("InventoryManage", policy => policy.RequireRole(Roles.BusinessOwner, Roles.ProcurementManager, Roles.BranchManager, Roles.StoreEmployee));
            options.AddPolicy("BranchManage", policy => policy.RequireRole(Roles.BusinessOwner));
            options.AddPolicy("TransferCreate", policy => policy.RequireRole(Roles.BusinessOwner, Roles.BranchManager, Roles.StoreEmployee));
            options.AddPolicy("TransferApprove", policy => policy.RequireRole(Roles.BusinessOwner, Roles.ProcurementManager, Roles.BranchManager));
            options.AddPolicy("TransferShip", policy => policy.RequireRole(Roles.BusinessOwner, Roles.BranchManager, Roles.StoreEmployee));
            options.AddPolicy("TransferReceive", policy => policy.RequireRole(Roles.BusinessOwner, Roles.BranchManager, Roles.StoreEmployee));
            options.AddPolicy("AiAnalyze", policy => policy.RequireRole(Roles.BusinessOwner, Roles.ProcurementManager, Roles.BranchManager));
            options.AddPolicy("AiReview", policy => policy.RequireRole(Roles.BusinessOwner, Roles.ProcurementManager, Roles.BranchManager));
            options.AddPolicy("UserManage", policy => policy.RequireRole(Roles.BusinessOwner));

            // Supplier module (Student 3) writes, integration decision D3
            options.AddPolicy("ProcurementManage", policy => policy.RequireRole(Roles.BusinessOwner, Roles.ProcurementManager));
        });

        return services;
    }
}
