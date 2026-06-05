# OmniVault 🔐

A secure, personal media vault built with Next.js, MongoDB, and Cloudinary. OmniVault allows you to elegantly store and manage your images, videos, documents, links, and personal notes in one centralized dashboard.

## 🌟 Features

- **Multi-Format Support**: Upload images, videos, PDFs, store web links, and write personal text notes.
- **Folder Organization**: Drag-and-drop items into custom folders to keep everything structured.
- **Smart Cloud Storage**: Integrates with Cloudinary for robust media handling (including zip-proxying for PDFs).
- **Secure Authentication**: Built-in NextAuth integration for secure, personal access.
- **Beautiful UI**: Modern, responsive, glass-morphism aesthetic using React and CSS modules.

## 🛠 Tech Stack

- **Framework**: [Next.js 15+ (App Router)](https://nextjs.org/)
- **Database**: [MongoDB](https://www.mongodb.com/) via Mongoose
- **Storage**: [Cloudinary](https://cloudinary.com/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Styling**: Vanilla CSS / React inline styles

## 🚀 Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/vibekprasadbin/omnivault.git
   cd omnivault
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory and add the following keys:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Migration Scripts

This repository includes local migration scripts (`migrate.js`, `migrate_pdfs.ts`) used to retroactively fix database states and cloud assets. They rely on the `.env.local` context and are intentionally ignored by Next.js builds.

## 📝 License

This project is licensed under the MIT License.
