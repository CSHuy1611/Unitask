using System;
using System.Text.Json;
class Program {
    static void Main() {
        try { Console.WriteLine("14:20 -> " + JsonSerializer.Deserialize<TimeSpan?>("\"14:20\"")); } catch(Exception e) { Console.WriteLine("14:20 FAILED: " + e.Message); }
        try { Console.WriteLine("14:20:00 -> " + JsonSerializer.Deserialize<TimeSpan?>("\"14:20:00\"")); } catch(Exception e) { Console.WriteLine("14:20:00 FAILED: " + e.Message); }
        try { Console.WriteLine("Empty -> " + JsonSerializer.Deserialize<TimeSpan?>("\"\"")); } catch(Exception e) { Console.WriteLine("Empty FAILED: " + e.Message); }
    }
}
