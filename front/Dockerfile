FROM localhost/pain-front-base

WORKDIR /app

COPY . .
RUN npm run build && mv dist dist-baked

CMD ["sh", "-c", "cp -rT /app/dist-baked /app/dist && tail -f /dev/null"]
