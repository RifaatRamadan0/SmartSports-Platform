using System.Data;
using Dapper;

namespace SmartSports.DAL.Data;

// Dapper does not know how to bind .NET 6 DateOnly/TimeOnly types as command parameters
// out of the box. Npgsql, however, natively supports both DateOnly (PostgreSQL `date`)
// and TimeOnly (PostgreSQL `time`) on the read path — so Parse needs to handle either
// the native type or the legacy DateTime/TimeSpan shape.

public class DateOnlyTypeHandler : SqlMapper.TypeHandler<DateOnly>
{
    public override DateOnly Parse(object value) => value switch
    {
        DateOnly d  => d,
        DateTime dt => DateOnly.FromDateTime(dt),
        _ => throw new DataException($"Cannot convert {value?.GetType().FullName} to DateOnly.")
    };

    public override void SetValue(IDbDataParameter parameter, DateOnly value)
    {
        parameter.DbType = DbType.Date;
        parameter.Value = value.ToDateTime(TimeOnly.MinValue);
    }
}

public class TimeOnlyTypeHandler : SqlMapper.TypeHandler<TimeOnly>
{
    public override TimeOnly Parse(object value) => value switch
    {
        TimeOnly t  => t,
        TimeSpan ts => TimeOnly.FromTimeSpan(ts),
        DateTime dt => TimeOnly.FromDateTime(dt),
        _ => throw new DataException($"Cannot convert {value?.GetType().FullName} to TimeOnly.")
    };

    public override void SetValue(IDbDataParameter parameter, TimeOnly value)
    {
        parameter.DbType = DbType.Time;
        parameter.Value = value.ToTimeSpan();
    }
}
