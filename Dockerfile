# Copyright (c) Microsoft Corporation and others. Licensed under the MIT license.
# SPDX-License-Identifier: MIT

FROM node:18
ENV APPDIR=/opt/service

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

ARG BUILD_NUMBER=0
ENV BUILD_NUMBER=$BUILD_NUMBER

COPY patches /tmp/patches
COPY .npmrc package*.json /tmp/
RUN cd /tmp && npm ci
RUN mkdir -p "${APPDIR}" && cp -a /tmp/node_modules "${APPDIR}"

WORKDIR "${APPDIR}"
COPY . "${APPDIR}"

ENV PORT 4000
EXPOSE 4000 2222
ENTRYPOINT ["npm", "start"]
