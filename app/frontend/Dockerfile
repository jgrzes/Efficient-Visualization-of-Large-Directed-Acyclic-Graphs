# create the image from inside the frontend directory

FROM node:20-slim

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 30306
EXPOSE 30307
EXPOSE 30308
EXPOSE 30309
EXPOSE 30310

CMD ["npm", "run", "dev", "--", "--host", "--port", "30306"]
