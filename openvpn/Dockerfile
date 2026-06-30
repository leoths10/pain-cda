FROM alpine:3.20

ENV http_proxy=http://proxy.infra.dgfip:3128
ENV https_proxy=http://proxy.infra.dgfip:3128

RUN apk add --no-cache \
    openvpn \
    iproute2 \
    bash

RUN mkdir -p /vpn

WORKDIR /vpn

CMD ["openvpn", "--config", "/vpn/IIA.conf"]
