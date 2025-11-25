import Footer from "@/components/common/footer";
import Header from "@/components/common/header";
import ChatFloatingButton from "@/components/common/chatbutton";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "@/store/redux_store";
import Head from "next/head";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useRouter } from "next/router";
import AdminLayout from "./admin/layout";

function AppContent({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isManagementPage = router.pathname.startsWith('/admin') ||
    router.pathname.startsWith('/moderator') 
    // ||
    // router.pathname.startsWith('/owner');

  const showAdminSidebar = router.pathname.startsWith("/admin") && router.pathname !== "/admin";

  return (
    <>
      <Head>
        <title>RetroTrade</title>
      </Head>

      {!isManagementPage && <Header />}

      <div className={isManagementPage ? "min-h-screen" : "pt-20 bg-white min-h-screen"}>
        {showAdminSidebar ? (
          <AdminLayout>
            <Component {...pageProps} />
          </AdminLayout>
        ) : (
          <Component {...pageProps} />
        )}

        {!isManagementPage && <Footer />}

        {/* Chat Button - Show on all pages */}
        <ChatFloatingButton />

        {mounted && (
          <Toaster
            richColors
            position="top-right"
            closeButton
            toastOptions={{
              classNames: {
                toast: "px-6 py-5 text-base",
                title: "text-lg font-semibold",
                description: "text-base",
                closeButton: "scale-110",
                actionButton: "text-base",
              },
            }}
          />
        )}
      </div>
    </>
  );
}

export default function App(props: AppProps) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <AppContent {...props} />
        </PersistGate>
      </Provider>
    </GoogleOAuthProvider>
  );
}