FROM alpine:3.4
MAINTAINER Austin Middleton

RUN apk --no-cache add --virtual build-deps git

RUN apk --no-cache add nodejs

RUN adduser -D p2pweb p2pweb
ADD . /home/p2pweb
RUN chown -R p2pweb:p2pweb /home/p2pweb
WORKDIR /home/p2pweb

USER p2pweb
RUN npm install

# Have to be root to remove deps
USER root
RUN apk del build-deps
USER p2pweb

ENTRYPOINT ["npm", "start"]
