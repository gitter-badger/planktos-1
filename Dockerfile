FROM alpine:3.4
MAINTAINER Austin Middleton

RUN apk --no-cache add --virtual build-deps git

RUN apk --no-cache add nodejs

RUN adduser -D planktos planktos
ADD . /home/planktos
RUN chown -R planktos:planktos /home/planktos
WORKDIR /home/planktos

USER planktos
RUN npm install

# Have to be root to remove deps
USER root
RUN apk del build-deps
USER planktos

ENTRYPOINT ["npm", "start"]
