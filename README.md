```
██╗     ███████╗████████╗███████╗    ██████╗  ██████╗     ██╗████████╗██╗
██║     ██╔════╝╚══██╔══╝██╔════╝    ██╔══██╗██╔═══██╗    ██║╚══██╔══╝██║
██║     █████╗     ██║   ███████╗    ██║  ██║██║   ██║    ██║   ██║   ██║
██║     ██╔══╝     ██║   ╚════██║    ██║  ██║██║   ██║    ██║   ██║   ╚═╝
███████╗███████╗   ██║   ███████║    ██████╔╝╚██████╔╝    ██║   ██║   ██╗
╚══════╝╚══════╝   ╚═╝   ╚══════╝    ╚═════╝  ╚═════╝     ╚═╝   ╚═╝   ╚═╝
```

<div align="center">

### 🚀 **A beautiful, backend-free todo list that syncs across all your devices**

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-lets--do--it.xyz-blueviolet?style=for-the-badge)](https://lets-do-it.xyz)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

---

## ✨ Features

- 📝 **Task Management** — Create, organize, and track your daily tasks
- 🔄 **Cross-Platform Sync** — Sync your data between devices using QR codes (no backend required!)
- 🎯 **Habit Tracking** — Build and maintain habits with visual progress charts
- 😊 **Happiness Tracking** — Monitor your daily happiness alongside your productivity
- 🏷️ **Tags & Organization** — Categorize tasks with custom tags
- 📱 **Browser Extension** — Access your tasks directly from your browser
- 💾 **Privacy first** — Your data stays on your devices - we don't get to see anything

---

## 🌐 Live Demo

**Check out the live application at [lets-do-it.xyz](https://lets-do-it.xyz)**

---


## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm or yarn

### Development


1. **Install dependencies**

```bash
cd LetsDoItApp
npm install
```

2. **Start the development server**

```bash
npm run dev
```

4. **Open your browser** at `http://localhost:5173`


## ☁️ Deploying to AWS

The application is deployed using **Terraform** to AWS with the following architecture:

- **S3 Bucket** — Stores static build files
- **CloudFront CDN** — Global distribution with HTTPS
- **ACM Certificate** — SSL/TLS for custom domain

### Prerequisites

- [Terraform](https://www.terraform.io/downloads.html) >= 1.0
- [AWS CLI](https://aws.amazon.com/cli/) configured with your credentials
- A domain name (optional, for custom domain)

### Deployment Steps

1. **Initialize Terraform**

```bash
cd infrastructure
terraform init
```

2. **Review the deployment plan**

```bash
terraform plan
```

3. **Apply the infrastructure**

```bash
terraform apply
```

4. **Deploy the application**

```bash
# Make deploy script executable (first time only)
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

This will:
- Build the React application
- Upload files to S3
- Invalidate CloudFront cache



## 🤝 Contributing

Contributions are welcome! Here's how you can help:

### How to Contribute

1. **Fork the repository**

   Click the "Fork" button at the top right of this page

2. **Clone your fork**

```bash
git clone https://github.com/YOUR_USERNAME/LetsDoIt.xyz.git
cd LetsDoIt.xyz
```

3. **Create a feature branch**

```bash
git checkout -b feature/amazing-feature
```

4. **Make your changes**

   - Write clean, readable code
   - Follow the existing code style
   - Test your changes locally

5. **Commit your changes**

```bash
git add .
git commit -m "feat: add amazing feature"
```

6. **Push to your fork**

```bash
git push origin feature/amazing-feature
```

7. **Open a Pull Request**

   - Go to the original repository
   - Click "New Pull Request"
   - Select your fork and branch
   - Describe your changes clearly
   - Submit the PR!

### Contribution Guidelines

- 🐛 **Bug Reports** — Open an issue with steps to reproduce
- 💡 **Feature Requests** — Open an issue describing the feature
- 📝 **Documentation** — Help improve our docs
- 🎨 **UI/UX** — Suggest design improvements

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**Made with ❤️ for productivity enthusiasts**

⭐ Star this repo if you find it useful!

</div>
