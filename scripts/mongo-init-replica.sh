#!/bin/bash
# This script runs inside the MongoDB container on first start
# It initializes the replica set required by Mongoose change streams

sleep 5

mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin <<EOF
try {
  rs.status();
  print("Replica set already initialized");
} catch (e) {
  rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "mongodb:27017" }] });
  print("Replica set initialized successfully");
}
EOF
