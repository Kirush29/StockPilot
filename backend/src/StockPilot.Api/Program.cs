using StockPilot.Application;
using StockPilot.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Add Clean Architecture layers
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// Add Web API services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure CORS for web and mobile clients
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowStockPilotClients", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowStockPilotClients");

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new
{
    status = "Healthy",
    service = "StockPilot.Api",
    timestamp = DateTime.UtcNow,
    component = "Sales & Demand Integration Ready"
}));

app.MapControllers();

app.Run();

