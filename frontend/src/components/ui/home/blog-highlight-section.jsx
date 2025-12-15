import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { homeApi } from "../../../services/home/home.api";

const TAG_STYLES = {
  default: {
    wrapper:
      "inline-flex items-center gap-2 rounded-full px-4 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.35em] bg-white/10 text-white/70",
    dot: "h-2 w-2 rounded-full bg-emerald-300",
  },
  highlight: {
    wrapper:
      "inline-flex items-center gap-2 rounded-full px-4 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.35em] bg-yellow-400/20 text-yellow-200",
    dot: "h-2 w-2 rounded-full bg-yellow-300",
  },
};

function NewsTag({ children, variant = "default" }) {
  const style = TAG_STYLES[variant] ?? TAG_STYLES.default;
  return (
    <span className={style.wrapper}>
      <span className={style.dot} />
      <span>{children}</span>
    </span>
  );
}

const LoadingState = () => (
  <section className="relative bg-white py-20">
    <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-gray-50" />
    <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-4">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 animate-pulse rounded-full bg-white/10" />
        <div className="h-8 w-32 animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="h-[320px] animate-pulse rounded-3xl bg-white/5 md:h-[380px]" />
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      </div>
    </div>
  </section>
);

const EmptyState = ({ message }) => (
  <section className="relative bg-white py-20">
    <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-gray-50" />
    <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 text-center text-gray-600">
      <p>{message}</p>
    </div>
  </section>
);

export default function BlogHighlightSection() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHighlightPosts = async () => {
      try {
        setLoading(true);
        const data = await homeApi.getHighlightPosts();
        setPosts(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        setError("Không thể tải bài viết nổi bật");
        console.error("Error fetching highlight posts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHighlightPosts();
  }, []);

  if (loading) {
    return <LoadingState />;
  }

  if (error || posts.length === 0) {
    return <EmptyState message={error || "Hiện chưa có bài viết nổi bật."} />;
  }

  const [featured, ...rest] = posts;
  const trending = rest.slice(0, 3);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-orange-50 py-24 px-4">
      <motion.div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23f59e0b\' fill-opacity=\'0.08\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/svg%3E')",
          backgroundSize: "60px 60px",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.04 }}
        transition={{ duration: 1 }}
      />
      <motion.div
        className="absolute -top-16 -left-10 h-40 w-40 rounded-full bg-amber-200/40 blur-3xl"
        animate={{
          y: [0, -15, 0],
          x: [0, 10, 0],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-20 right-10 h-48 w-48 rounded-full bg-orange-200/40 blur-3xl"
        animate={{
          y: [0, 20, 0],
          x: [0, -15, 0],
          opacity: [0.3, 0.55, 0.3],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <div className="container relative z-10 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex items-center gap-3">
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg"
            >
              <Sparkles className="h-6 w-6" />
            </motion.span>
            <div>
              <h2 className="text-3xl font-semibold text-gray-900 md:text-4xl">
                Tin tức nổi bật
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Cập nhật những câu chuyện mới nhất từ cộng đồng RetroTrade
              </p>
            </div>
          </div>
          <motion.a
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            href="/blog"
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-6 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-gray-900 transition hover:border-amber-400 hover:bg-amber-50"
          >
            Xem tất cả
            <ArrowRight className="h-4 w-4" />
          </motion.a>
        </motion.div>

        <div className="grid items-stretch gap-10 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
          {/* Featured Post */}
          <motion.article
            whileHover={{ translateY: -6 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="group relative flex h-full min-h-[360px] overflow-hidden rounded-3xl bg-gradient-to-br from-black/80 via-black/60 to-black/40 shadow-[0_40px_90px_-50px_rgba(249,115,22,0.35)] cursor-pointer"
            onClick={() => {
              if (featured?._id) {
                window.location.href = `/blog/${featured._id}`;
              }
            }}
          >
            <div className="relative h-full w-full">
              <img
                src={
                  featured?.thumbnail ||
                  "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1200&q=80"
                }
                alt={featured?.title || "Featured post"}
                className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end gap-4 p-10 text-white">
                <div className="flex flex-wrap items-center gap-3 text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-white/70">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-yellow-300" />
                    {featured?.createdAt
                      ? new Date(featured.createdAt).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "Tin mới"}
                  </span>
                  {featured?.categoryId?.name && <span>{featured.categoryId.name}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <NewsTag variant="highlight">
                    {featured?.tags?.length ? featured.tags[0].name : "Tin tức"}
                  </NewsTag>
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="rounded-full bg-white/10 px-3 py-1 text-[0.55rem] uppercase tracking-[0.35em] text-white/70"
                  >
                    Nổi bật
                  </motion.span>
                </div>
                <h3 className="text-2xl font-semibold sm:text-3xl md:text-4xl drop-shadow-[0_6px_25px_rgba(0,0,0,0.65)]">
                  {featured?.title || "Bài viết nổi bật"}
                </h3>
                {featured?.shortDescription && (
                  <p className="max-w-2xl text-sm text-white/70">
                    {featured.shortDescription}
                  </p>
                )}
              </div>
            </div>
          </motion.article>

          {/* Trending Posts */}
          <aside className="flex flex-col gap-6 rounded-3xl border border-amber-100 bg-white/80 p-6 shadow-2xl backdrop-blur">
            <div className="space-y-4">
              {trending.map((item, index) => (
                <motion.div
                  key={item._id || index}
                  whileHover={{ translateY: -4, scale: 1.02 }}
                  className="group flex gap-4 rounded-2xl border border-amber-100 bg-white/70 p-4 transition hover:border-amber-400/60 hover:bg-white cursor-pointer"
                  onClick={() => {
                    if (item._id) {
                      window.location.href = `/blog/${item._id}`;
                    }
                  }}
                >
                  <div className="relative h-18 w-18 flex-shrink-0 overflow-hidden rounded-xl shadow-inner">
                    <img
                      src={
                        item.thumbnail ||
                        "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=400&q=80"
                      }
                      alt={item.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex items-center gap-2 text-[0.55rem] font-semibold uppercase tracking-[0.35em] text-amber-600">
                      <span className="inline-block h-2 w-2 rounded-full bg-yellow-300" />
                      {item.tags?.length ? item.tags[0].name : "Tin tức"}
                    </div>
                    <h4 className="mt-2 text-base font-semibold text-gray-900 transition group-hover:text-amber-600">
                      {item.title}
                    </h4>
                    <p className="mt-3 text-[0.65rem] uppercase tracking-[0.35em] text-gray-500">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Tin mới"}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
