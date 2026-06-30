FROM node:20-alpine

WORKDIR /app

# Dépendances — couche mise en cache tant que package*.json ne changent pas
COPY package*.json ./
RUN npm install --include=dev

# Code applicatif + build
COPY . .
RUN npm run build && mv dist dist-baked

# Au démarrage : publie le build dans le volume partagé puis reste actif
CMD ["sh", "-c", "cp -rT /app/dist-baked /app/dist && tail -f /dev/null"]
