#!/bin/bash

# Define variables
buildName="serversocialnetwork"
dataVolume="$(pwd)/social.db"
serverPort=8080

# Print build message
echo "Building $buildName"

# Remove existing container if any
if mycontainer=$(docker ps -a --filter "ancestor=$buildName" --format '{{.Names}}'); then
    if [ -z "$mycontainer" ]; then
        echo "No container to remove"
    else
        echo "Removing container $mycontainer"
        docker stop $mycontainer
        docker rm $mycontainer
    fi
fi

# Build and run the container
docker build -t $buildName . && docker run -v "$dataVolume:/app/social.db" -p "$serverPort:$serverPort" -d "$buildName"

# Wait until server is up
counter=0
while ! curl -s "localhost:$serverPort" > /dev/null; do
    sleep 1
    counter=$((counter + 1))
    if [ $counter -gt 15 ]; then
        echo "Server is down. Check Docker logs."
        exit 1
    fi
done

# Print success message
echo "Server is up and running."
