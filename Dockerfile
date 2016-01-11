FROM ubuntu:14.04
MAINTAINER Austin Middleton

RUN apt-get update
RUN apt-get upgrade -y

RUN apt-get install -y\
    nodejs\
    npm

RUN ln -s /usr/bin/nodejs /usr/bin/node

RUN addgroup --gid 4000 p2pweb
RUN useradd --gid 4000 p2pweb

Add . /home/p2pweb/
WORKDIR /home/p2pweb
RUN chown -R p2pweb:p2pweb .
USER p2pweb

RUN npm install

ENTRYPOINT ["npm", "start"]
