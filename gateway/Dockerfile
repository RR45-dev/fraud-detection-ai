# Build context is the project root so the proto/ directory can be copied in.
FROM node:20-alpine
WORKDIR /app
COPY gateway/package.json .
RUN npm install --omit=dev
COPY gateway/. .
COPY proto ../proto
EXPOSE 4000
CMD ["node", "server.js"]
