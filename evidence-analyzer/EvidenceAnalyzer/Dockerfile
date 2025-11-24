# 1. Fázis: Buildelés (.NET SDK-val)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
# Figyelj: Itt a .csproj fájl nevének egyeznie kell a projekted nevével!
COPY ["EvidenceAnalyzer.csproj", "./"]
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish

# 2. Fázis: Futtatás (ASP.NET Core Runtime)
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
# A konténeren belül a 80-as vagy 8080-as porton figyel alapból
ENV ASPNETCORE_HTTP_PORTS=5000
EXPOSE 5000
ENTRYPOINT ["dotnet", "EvidenceAnalyzer.dll"]