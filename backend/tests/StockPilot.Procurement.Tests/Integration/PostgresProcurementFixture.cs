using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Npgsql;
using StockPilot.Procurement.Application.Services;
using StockPilot.Procurement.Domain.Common;
using StockPilot.Procurement.Infrastructure.ExternalStubs;
using StockPilot.Procurement.Infrastructure.Persistence;
using StockPilot.Procurement.Infrastructure.Repositories;
using StockPilot.Procurement.Tests.TestHelpers;

namespace StockPilot.Procurement.Tests.Integration;

/// <summary>
/// Runs only when STOCKPILOT_TEST_POSTGRES holds a connection string to a PostgreSQL server the
/// tests may create databases on (e.g. "Host=localhost;Port=55432;Username=postgres"). Skipped
/// otherwise, so the default test run needs no database.
/// </summary>
public sealed class PostgresFactAttribute : FactAttribute
{
    public const string EnvironmentVariable = "STOCKPILOT_TEST_POSTGRES";

    public PostgresFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(EnvironmentVariable)))
        {
            Skip = $"Set {EnvironmentVariable} to a PostgreSQL connection string to run database integration tests.";
        }
    }
}

/// <summary>
/// Creates a uniquely named database, applies the real Procurement migrations (including the
/// seed data and CHECK constraints), and drops the database afterwards.
/// </summary>
public sealed class PostgresProcurementFixture : IAsyncLifetime
{
    private readonly string? _serverConnectionString = Environment.GetEnvironmentVariable(PostgresFactAttribute.EnvironmentVariable);
    private readonly string _databaseName = $"stockpilot_proc_test_{Guid.NewGuid():N}";

    public string ConnectionString { get; private set; } = "";

    public bool Enabled => !string.IsNullOrWhiteSpace(_serverConnectionString);

    public async Task InitializeAsync()
    {
        if (!Enabled)
        {
            return;
        }

        await using (var admin = new NpgsqlConnection(_serverConnectionString))
        {
            await admin.OpenAsync();
            await using var create = new NpgsqlCommand($"CREATE DATABASE \"{_databaseName}\"", admin);
            await create.ExecuteNonQueryAsync();
        }

        ConnectionString = new NpgsqlConnectionStringBuilder(_serverConnectionString) { Database = _databaseName, Pooling = false }.ConnectionString;
        await using var context = NewContext();
        await context.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        if (!Enabled)
        {
            return;
        }

        await using var admin = new NpgsqlConnection(_serverConnectionString);
        await admin.OpenAsync();
        await using var drop = new NpgsqlCommand($"DROP DATABASE IF EXISTS \"{_databaseName}\" WITH (FORCE)", admin);
        await drop.ExecuteNonQueryAsync();
    }

    /// <summary>A fresh context, configured exactly like AddProcurementInfrastructure does for Npgsql.</summary>
    public ProcurementDbContext NewContext() => new(
        new DbContextOptionsBuilder<ProcurementDbContext>()
            .UseNpgsql(ConnectionString, npgsql => npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "procurement"))
            .Options);

    public ProcurementProposalService ProposalService(ProcurementDbContext context, Guid userId, params string[] roles) => new(
        new EfProposalRepository(context),
        new EfBudgetRepository(context),
        new InMemoryProductCatalogService(),
        new InMemorySupplierDirectoryService(),
        new InMemoryBranchDirectoryService(),
        new FakeCurrentUserService(userId, roles.Length > 0 ? roles : [ProcurementRoles.ProcurementManager]),
        new EfUnitOfWork(context),
        Options.Create(new ApprovalLimitOptions { ProcurementManager = 50_000m, BusinessOwner = null }),
        NullLogger<ProcurementProposalService>.Instance);

    public PurchaseOrderService OrderService(ProcurementDbContext context, Guid userId, IProposalRepositoryHook? hook = null) => new(
        new EfPurchaseOrderRepository(context),
        hook?.Wrap(new EfProposalRepository(context)) ?? new EfProposalRepository(context),
        new EfBudgetRepository(context),
        new FakeInventoryStockUpdater(),
        new FakeCurrentUserService(userId, ProcurementRoles.ProcurementManager),
        new EfUnitOfWork(context),
        NullLogger<PurchaseOrderService>.Instance);
}

/// <summary>Lets a test intercept proposal reads, e.g. to line up two concurrent conversions.</summary>
public interface IProposalRepositoryHook
{
    StockPilot.Procurement.Application.Repositories.IProposalRepository Wrap(StockPilot.Procurement.Application.Repositories.IProposalRepository inner);
}
