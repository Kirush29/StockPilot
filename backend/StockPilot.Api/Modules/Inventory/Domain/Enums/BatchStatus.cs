using System.Text.Json.Serialization;

namespace StockPilot.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum BatchStatus
{
    Active,
    Quarantined,
    Expired,
    Exhausted,
    Damaged,
    Depleted
}
