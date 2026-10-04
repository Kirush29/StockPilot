using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using StockPilot.Domain.Entities;
using StockPilot.Infrastructure.Data;

namespace StockPilot.Shared.Identity;

/// <summary>
/// Provides a safe, idempotent bootstrap mechanism for provisioning the initial
/// production Business Owner account via environment variables.
/// </summary>
public static class ProductionAdminBootstrap
{
    public static async Task BootstrapAdminAsync(StockPilotDbContext db, IConfiguration configuration, ILogger logger)
    {
        var enabled = configuration.GetValue<bool>("BootstrapAdmin:Enabled");
        if (!enabled)
        {
            return;
        }

        var username = configuration["BootstrapAdmin:Username"]?.Trim();
        var email = configuration["BootstrapAdmin:Email"]?.Trim();
        var password = configuration["BootstrapAdmin:Password"];
        var fullName = configuration["BootstrapAdmin:FullName"]?.Trim() ?? "System Business Owner";

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning("Admin bootstrap is enabled, but required settings (BootstrapAdmin:Username, BootstrapAdmin:Email, BootstrapAdmin:Password) are missing or incomplete. Skipping bootstrap.");
            return;
        }

        if (password.Length < 10)
        {
            logger.LogWarning("Admin bootstrap password does not meet the minimum requirement (at least 10 characters). Skipping bootstrap.");
            return;
        }

        // Idempotency: Check if an account already exists with the given username or email
        var existingUser = await db.Users.FirstOrDefaultAsync(u =>
            u.Username.ToLower() == username.ToLower() ||
            u.Email.ToLower() == email.ToLower());

        if (existingUser != null)
        {
            logger.LogInformation("Admin bootstrap: Account already exists for username '{Username}' or email '{Email}'. Existing account preserved without modification.", username, email);
            return;
        }

        var hasher = new PasswordHasher<User>();
        var user = new User
        {
            UserId = Guid.NewGuid(),
            Username = username,
            Email = email,
            FullName = fullName,
            Role = StockPilotIdentity.Roles.BusinessOwner,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            BranchId = null,
            MustChangePassword = false
        };

        user.PasswordHash = hasher.HashPassword(user, password);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        logger.LogInformation("Admin bootstrap: Successfully created initial Business Owner account for '{Username}'. IMPORTANT: Disable or remove 'BootstrapAdmin__Enabled' in your hosting environment now.", username);
    }
}
