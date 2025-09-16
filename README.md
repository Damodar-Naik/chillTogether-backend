mkdir my-express-ts-app
cd my-express-ts-app
npm init -y


# Core dependencies
npm install express cors dotenv helmet morgan

# TypeScript and development dependencies
npm install --save-dev typescript @types/node @types/express @types/cors @types/morgan ts-node nodemon

# Optional: install @types for other packages
npm install --save-dev @types/helmet

# Optional: install websockets
npm i ws
npm i --save-dev @types/ws