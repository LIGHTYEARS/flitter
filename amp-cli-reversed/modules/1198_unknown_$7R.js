function $7R(T, R) {
  if (T) switch (T) {
    case "date":
      return "2024-01-15";
    case "date-time":
      return "2024-01-15T10:30:00Z";
    case "time":
      return "10:30:00";
    case "email":
      return "user@example.com";
    case "uri":
    case "url":
      return "https://example.com";
    case "uuid":
      return "550e8400-e29b-41d4-a716-446655440000";
    case "ipv4":
      return "192.168.1.1";
    case "ipv6":
      return "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
  }
  if (R) {
    let a = R.toLowerCase();
    if (a.includes("date") || a.includes("time")) return "2024-01-15";
    if (a.includes("email")) return "user@example.com";
    if (a.includes("url") || a.includes("uri") || a.includes("link")) return "https://example.com";
    if (a.includes("id") || a.includes("key")) return "ABC-123";
    if (a.includes("name")) return "Example Name";
    if (a.includes("description") || a.includes("summary") || a.includes("comment")) return "Example text";
    if (a.includes("path") || a.includes("file")) return "/path/to/file";
  }
  return "example";
}