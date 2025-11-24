# 1. Fázis: Buildelés (Maven image-ben)
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
# Teszteket kihagyjuk a gyorsaság érdekében (-DskipTests)
RUN mvn clean package -DskipTests

# 2. Fázis: Futtatás (Csak a JRE kell, kisebb image)
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]