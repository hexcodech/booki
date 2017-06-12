#Use node container as base
FROM node:7.10

#Set the working directory
WORKDIR /booki

#Copy the current directory contents into the container at /booki
ADD . /booki

RUN yarn install

EXPOSE 8101

CMD ["yarn", "start"]
