using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using StockPilot.Application.Interfaces;
using StockPilot.Application.Services;
using StockPilot.Infrastructure.Data;
using StockPilot.Infrastructure.Repositories;
using StockPilot.Application.Models;
using StockPilot.Infrastructure.Services;

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

builder.Services.Configure<AgenticAiSettings>(
    builder.Configuration.GetSection("AgenticAi"));
builder.Services.AddScoped<IAgenticAiIntegrationService, AgenticAiIntegrationService>();

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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
