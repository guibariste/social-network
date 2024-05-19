# Build stage
FROM golang:alpine AS build
WORKDIR /app
COPY . .
RUN apk add --no-cache gcc musl-dev sqlite-dev && \
    go build -ldflags="-s -w" -o main .

# Final stage
FROM alpine
WORKDIR /app
COPY --from=build /app/ .
RUN apk add --no-cache sqlite
EXPOSE 8080
CMD ["./main"]
