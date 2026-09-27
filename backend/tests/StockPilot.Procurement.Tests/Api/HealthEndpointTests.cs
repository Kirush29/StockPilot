using System.Net;
using FluentAssertions;

namespace StockPilot.Procurement.Tests.Api;

public class HealthEndpointTests(ProcurementApiFactory factory) : IClassFixture<ProcurementApiFactory>
{
    [Fact]
    public async Task GetHealth_Anonymous_Returns200AndHealthyStatus()
    {
        var client = factory.ClientAs(null);
        var response = await client.GetAsync("/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.ReadJsonAsync();
        json.GetProperty("status").GetString().Should().Be("Healthy");
        json.GetProperty("database").GetString().Should().Be("Connected");
    }

    [Fact]
    public async Task GetApiHealth_Anonymous_Returns200AndHealthyStatus()
    {
        var client = factory.ClientAs(null);
        var response = await client.GetAsync("/api/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.ReadJsonAsync();
        json.GetProperty("status").GetString().Should().Be("Healthy");
        json.GetProperty("database").GetString().Should().Be("Connected");
    }
}
