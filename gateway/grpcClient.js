const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

// Dynamic proto loading — no generated stubs needed on the Node side.
const PROTO_PATH = path.join(__dirname, "..", "proto", "fraud.proto");
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const fraudProto = grpc.loadPackageDefinition(packageDef).fraud;

const client = new fraudProto.FraudScorer(
  process.env.ML_SERVICE_ADDR || "localhost:50051",
  grpc.credentials.createInsecure()
);

function scoreTransaction(transaction) {
  return new Promise((resolve, reject) => {
    client.ScoreTransaction(transaction, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

module.exports = { scoreTransaction };
