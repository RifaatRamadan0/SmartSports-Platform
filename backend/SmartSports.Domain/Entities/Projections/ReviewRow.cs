namespace SmartSports.Domain.Entities.Projections;

public record ReviewRow(
    int      Id,
    string   ReviewerName,
    short    Rating,
    string?  Comment,
    DateTime CreatedAt);
