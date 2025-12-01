"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getAllPosts,
  getAllCategories,
  getAllTags,
  getBlogDetail,
  getPostsByCategory,
  getPostsByTag,
} from "@/services/auth/blog.api";
import Link from "next/link";
import { ChevronRight, ArrowLeft } from "lucide-react";
import CommentSection from "./comment";
export default function BlogDetailPage() {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [post, setPost] = useState<any>(null);
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<"category" | "tag" | null>(null);
  const [filterName, setFilterName] = useState<string>("");

  useEffect(() => {
    const path = window.location.pathname.split("/");
    const postId = path[path.length - 1];
    setId(postId);
  }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [postData, allPosts, cateData, tagData] = await Promise.all([
          getBlogDetail(id),
          getAllPosts(),
          getAllCategories(),
          getAllTags(),
        ]);
        setPost(postData);
        setCategories(cateData);
        setTags(tagData);

        // Bài viết nổi bật (liên quan)
        const related = (allPosts?.data || allPosts || [])
          .filter((p: any) => p._id !== id)
          .slice(0, 3);
        setRelatedPosts(related);
      } catch (error) {
        console.error("Error fetching blog data:", error);
      }
    })();
  }, [id]);

  const handleCategoryClick = async (cateId: string, name: string) => {
    try {
      const posts = await getPostsByCategory(cateId);
      setFilteredPosts(posts.data || posts);
      setFilterType("category");
      setFilterName(name);
    } catch (err) {
      console.error("Lỗi khi lọc theo danh mục:", err);
    }
  };

  const handleTagClick = async (tagId: string, name: string) => {
    try {
      const posts = await getPostsByTag(tagId);
      setFilteredPosts(posts.data || posts);
      setFilterType("tag");
      setFilterName(name);
    } catch (err) {
      console.error("Lỗi khi lọc theo tag:", err);
    }
  };

  const resetFilter = () => {
    setFilterType(null);
    setFilterName("");
    setFilteredPosts([]);
  };

  if (!post) return <p className="text-center py-10">Đang tải bài viết...</p>;

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 flex flex-col md:flex-row gap-8">
      <div className="flex-1">
        {/* Nút quay lại */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Quay lại</span>
        </button>

        <nav className="text-sm text-gray-500 mb-4 flex items-center flex-wrap">
          <Link href="/" className="hover:text-blue-600">
            Trang chủ
          </Link>
          <ChevronRight className="w-4 h-4 mx-1" />
          <Link href="/blog" className="hover:text-blue-600">
            Blog
          </Link>
          <ChevronRight className="w-4 h-4 mx-1" />
          <span className="text-gray-700 font-medium line-clamp-1">
            {post.title}
          </span>
        </nav>

        <h1 className="text-3xl font-bold mb-3 text-black">{post.title}</h1>

        <div className="flex items-center gap-2 text-gray-500 text-sm mb-5">
          {post.authorId?.avatar ? (
            <img
              src={post.authorId.avatar}
              alt="avatar"
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
              {post.authorId?.email
                ? post.authorId.email.charAt(0).toUpperCase()
                : "?"}
            </div>
          )}
          <span>{post.authorId?.fullName || "Ẩn danh"}</span>•
          <span>{new Date(post.createdAt).toLocaleDateString("vi-VN")}</span>•
          <span>5 phút đọc</span>
        </div>

        {post.thumbnail ? (
          <img
            src={post.thumbnail}
            alt={post.title}
            className="rounded-xl mb-2 w-full object-cover"
          />
        ) : (
          <div className="rounded-xl mb-2 w-full h-64 bg-gray-200 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">📝</div>
              <div className="text-sm">Không có hình minh họa</div>
            </div>
          </div>
        )}
        <p className="text-sm text-gray-500 mb-6 text-center">
          {post.caption || "Hình minh họa cho bài viết"}
        </p>

        <div
          className="prose prose-blue max-w-none text-black"
          dangerouslySetInnerHTML={{
            __html: post.content.replace(/\n/g, "<br/>"),
          }}
        />

        {post && <CommentSection postId={post._id} />}
      </div>

      <aside className="w-full md:w-60 space-y-6">
        <div className="bg-white shadow rounded-2xl p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-black">
              {filterType
                ? `Bài viết theo ${
                    filterType === "category" ? "danh mục" : "tag"
                  }: ${filterName}`
                : "Bài viết nổi bật"}
            </h3>
            {filterType && (
              <button
                onClick={resetFilter}
                className="text-xs text-blue-500 hover:underline"
              >
                Xóa lọc
              </button>
            )}
          </div>

          <ul className="space-y-4">
            {(filteredPosts.length > 0 ? filteredPosts : relatedPosts).map(
              (p) => (
                <li
                  key={p._id}
                  className="flex gap-3 items-center cursor-pointer hover:opacity-80"
                  onClick={() => router.push(`/blog/${p._id}`)}
                >
                  {p.thumbnail ? (
                    <img
                      src={p.thumbnail}
                      alt={p.title}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-lg">📝</span>
                    </div>
                  )}
                  <div className="text-sm">
                    <p className="font-medium leading-snug text-black">
                      {p.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </li>
              )
            )}
          </ul>
        </div>

        {/* Danh mục */}
        <div className="bg-white shadow rounded-2xl p-5">
          <h3 className="font-semibold mb-3 text-black">Danh mục</h3>
          <ul className="space-y-2 text-gray-700">
            {categories.map((c) => (
              <li
                key={c._id}
                onClick={() => handleCategoryClick(c._id, c.name)}
                className="hover:text-blue-600 cursor-pointer"
              >
                {c.name}{" "}
                <span className="text-gray-400 text-xs">({c.count || 0})</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tag phổ biến */}
        <div className="bg-white shadow rounded-2xl p-5">
          <h3 className="font-semibold mb-3 text-black">Tag phổ biến</h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t._id}
                onClick={() => handleTagClick(t._id, t.name)}
                className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full hover:bg-blue-100 hover:text-blue-600 cursor-pointer"
              >
                #{t.name}
              </span>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}