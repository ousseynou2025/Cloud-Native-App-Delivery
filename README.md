# 📦 Cloud-Native App Delivery — TechLogix Inventory App

> **TP Final** | Cloud-Native App Delivery | Deadline : 12 mars 2026

[![CI/CD](https://github.com/ousseynou2025/Cloud-Native-App-Delivery/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/ousseynou2025/Cloud-Native-App-Delivery/actions)
[![Docker Hub](https://img.shields.io/docker/v/weuth/inventory-app?label=Docker%20Hub&logo=docker)](https://hub.docker.com/r/weuth/inventory-app)

---

## 🗂️ Structure du projet

```
.
├── app/                        # Code source Node.js/Express
│   ├── index.js                # Application principale (API + UI)
│   └── package.json            # Dépendances NPM
├── .github/
│   └── workflows/
│       └── ci-cd.yml           # Pipeline GitHub Actions (3 jobs)
├── k8s/
│   ├── Deployment.yaml         # Déploiement K8s (3 réplicas, rolling update)
│   └── Service.yaml            # Service LoadBalancer / NodePort
├── Dockerfile                  # Build multi-stage optimisé (Alpine)
├── .dockerignore
├── .gitignore
└── README.md
```

---

## 🐳 Phase 1 — Conteneurisation Docker

### Architecture du Dockerfile

Le Dockerfile utilise un **build multi-stage** pour minimiser la taille de l'image finale :

| Stage | Base | Rôle |
|-------|------|------|
| `builder` | `node:18-alpine` | Installation des dépendances NPM |
| `production` | `node:18-alpine` | Image finale légère (~60 Mo) |

**Optimisations appliquées :**
- 🏔️ Image `alpine` (légèreté)
- 📦 Multi-stage build (suppression des devDependencies)
- 🔒 Exécution en tant que **non-root user** (`appuser`)
- 💾 Cache des couches Docker (`COPY package.json` avant `COPY app/`)
- 🏥 `HEALTHCHECK` intégré

### Lancer l'application en local avec Docker

```bash
# 1. Cloner le dépôt
git clone https://github.com/ousseynou2025/Cloud-Native-App-Delivery.git
cd Cloud-Native-App-Delivery

# 2. Construire l'image Docker
docker build -t inventory-app:v1.0 .

# 3. Vérifier que l'image est bien créée
docker images | grep inventory-app

# 4. Lancer le conteneur en local
docker run -d \
  --name inventory-app \
  -p 3000:3000 \
  inventory-app:v1.0

# 5. Tester l'application
curl http://localhost:3000/healthz
# → {"status":"ok","uptime":...}

# Ouvrir dans le navigateur
open http://localhost:3000

# 6. Voir les logs
docker logs -f inventory-app

# 7. Arrêter et supprimer le conteneur
docker stop inventory-app && docker rm inventory-app
```

### Tester l'API REST

```bash
# Lister l'inventaire
curl http://localhost:3000/api/inventory

# Ajouter un article
curl -X POST http://localhost:3000/api/inventory \
  -H "Content-Type: application/json" \
  -d '{"name":"Switch 24 ports","quantity":5,"price":75000,"category":"Réseau"}'
```

---

## ⚙️ Phase 2 — Pipeline CI/CD (GitHub Actions)

### Architecture du pipeline

Le pipeline est défini dans `.github/workflows/ci-cd.yml` et comprend **3 jobs séquentiels** :

```
git push
    │
    ▼
┌─────────────────────┐
│  JOB 1: build       │  → Construit l'image Docker (sans push)
│  🔨 Build           │    Utilise le cache GitHub Actions (GHA)
└──────────┬──────────┘
           │ artifact (image.tar)
           ▼
┌─────────────────────┐
│  JOB 2: security    │  → Analyse des vulnérabilités (Trivy)
│  🔒 Trivy Scan      │    Severity : CRITICAL + HIGH
└──────────┬──────────┘
           │ (only on push to main/master)
           ▼
┌─────────────────────┐
│  JOB 3: push        │  → Login Docker Hub via Secrets
│  🚀 Push to Hub     │    Push avec tags : v1.0, latest, sha-XXXXXX
└─────────────────────┘
```

### Déclencheurs

| Événement | Branch | Action |
|-----------|--------|--------|
| `push` | `main` / `master` | Build + Scan + Push |
| `pull_request` | `main` / `master` | Build + Scan uniquement |

### Configuration des GitHub Secrets

Dans **Settings → Secrets and variables → Actions**, ajouter :

| Secret | Description |
|--------|-------------|
| `DOCKERHUB_USERNAME` | Votre nom d'utilisateur Docker Hub |
| `DOCKERHUB_TOKEN` | Access Token Docker Hub (pas le mot de passe) |

> **Créer un token Docker Hub :** Hub → Account Settings → Personal Access Tokens → Generate

### Tags générés automatiquement

| Tag | Valeur |
|-----|--------|
| `v1.0` | Tag de version fixe |
| `latest` | Dernière image stable |
| `sha-abc1234` | SHA court du commit |

### Captures d'écran requises

> **✅ CI/CD Pipeline (à ajouter)**
>
> ![Pipeline GitHub Actions](.github/screenshots/pipeline-success.png)
> *Vue du pipeline réussi avec les 3 jobs en vert*

> **✅ Docker Hub (à ajouter)**
>
> ![Docker Hub Image](.github/screenshots/dockerhub-image.png)
> *Image présente sur Docker Hub avec les tags v1.0 et latest*

---

## ☸️ Phase 3 — Orchestration Kubernetes

### Pré-requis

```bash
# Vérifier que kubectl est configuré
kubectl cluster-info

# Pour Minikube (démarrer le cluster si nécessaire)
minikube start --driver=docker
```

### Modifier le manifeste Deployment

Avant de déployer, remplacer `weuth` dans `k8s/Deployment.yaml` :

```bash
# Remplacer le placeholder par votre username Docker Hub
sed -i 's/weuth/votre_username/g' k8s/Deployment.yaml
```

### Déployer sur le cluster

```bash
# 1. Appliquer le Deployment (3 réplicas)
kubectl apply -f k8s/Deployment.yaml

# 2. Appliquer le Service (LoadBalancer)
kubectl apply -f k8s/Service.yaml

# -- Ou appliquer tout le dossier k8s en une commande --
kubectl apply -f k8s/
```

### Vérifier l'état du déploiement

```bash
# Vue d'ensemble complète (Pods + Service + Deployment)
kubectl get all -l app=inventory-app

# Vérifier que les 3 pods sont Running
kubectl get pods -l app=inventory-app -w

# Détails du Deployment
kubectl describe deployment inventory-app

# Logs d'un pod
kubectl logs -l app=inventory-app --tail=50

# Récupérer l'adresse IP externe (LoadBalancer)
kubectl get service inventory-app-service
```

### Accéder à l'application

**Sur un cluster cloud (AWS EKS, GKE, AKE) :**
```bash
# Récupérer l'EXTERNAL-IP
export EXTERNAL_IP=$(kubectl get svc inventory-app-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Application : http://$EXTERNAL_IP"
```

**Sur Minikube :**
```bash
# Changer le type en NodePort dans Service.yaml, puis :
minikube service inventory-app-service --url

# Ou utiliser le tunnel (pour LoadBalancer)
minikube tunnel
```

**Sur K3s :**
```bash
# Récupérer l'IP du nœud
kubectl get nodes -o wide
# Accès via : http://<NODE_IP>:30080 (si NodePort 30080)
```

### Effectuer une mise à jour (Rolling Update)

```bash
# Mettre à jour l'image vers une nouvelle version
kubectl set image deployment/inventory-app \
  inventory-app=weuth/inventory-app:v2.0

# Suivre le rollout
kubectl rollout status deployment/inventory-app

# Annuler en cas de problème
kubectl rollout undo deployment/inventory-app
```

### Captures d'écran requises

> **✅ kubectl get all (à ajouter)**
>
> ```
> NAME                                 READY   STATUS    RESTARTS   AGE
> pod/inventory-app-7d9f8b6c4-abc12    1/1     Running   0          2m
> pod/inventory-app-7d9f8b6c4-def34    1/1     Running   0          2m
> pod/inventory-app-7d9f8b6c4-ghi56    1/1     Running   0          2m
>
> NAME                            TYPE           CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
> service/inventory-app-service   LoadBalancer   10.100.200.50   <EXTERNAL-IP> 80:31234/TCP   2m
>
> NAME                           READY   UP-TO-DATE   AVAILABLE   AGE
> deployment.apps/inventory-app  3/3     3            3           2m
> ```
>
> ![kubectl get all](.github/screenshots/kubectl-get-all.png)

> **✅ Application dans le navigateur (à ajouter)**
>
> ![Application Browser](.github/screenshots/app-browser.png)
> *L'application Inventory App affichée via l'IP du cluster*

---

## 📋 Récapitulatif des commandes kubectl

| Commande | Description |
|----------|-------------|
| `kubectl apply -f k8s/` | Déployer tous les manifestes |
| `kubectl get all -l app=inventory-app` | Voir l'état complet |
| `kubectl get pods -w` | Surveiller les pods en temps réel |
| `kubectl logs -l app=inventory-app` | Voir les logs applicatifs |
| `kubectl describe deployment inventory-app` | Détails du déploiement |
| `kubectl rollout status deployment/inventory-app` | Statut du rolling update |
| `kubectl rollout undo deployment/inventory-app` | Rollback |
| `kubectl delete -f k8s/` | Supprimer les ressources |

---

## 🔧 Technologies utilisées

| Composant | Technologie |
|-----------|-------------|
| Application | Node.js 18 + Express 4 |
| Conteneurisation | Docker (multi-stage, Alpine) |
| CI/CD | GitHub Actions |
| Security Scan | Trivy (Aqua Security) |
| Registry | Docker Hub |
| Orchestration | Kubernetes (Deployment + Service) |
| Cluster local | Minikube / K3s |

---

## 👤 Auteur

**TechLogix DevOps Team** — TP Cloud-Native App Delivery 2026
