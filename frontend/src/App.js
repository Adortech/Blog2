import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

function App() {
  const [currentView, setCurrentView] = useState('home'); // 'home', 'admin', 'login'
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [loading, setLoading] = useState(false);

  // Auth state
  const [loginData, setLoginData] = useState({ username: '', password: '' });

  // Post form state
  const [postForm, setPostForm] = useState({
    title: '',
    content: '',
    category: '',
    image_url: '',
    published: true
  });

  // Category form state
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    loadPosts();
    loadCategories();
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await axios.get(`${API_BASE_URL}/api/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      }
    }
  };

  const loadPosts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/posts`);
      setPosts(response.data);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, loginData);
      localStorage.setItem('token', response.data.access_token);
      setIsAuthenticated(true);
      setCurrentView('admin');
      setLoginData({ username: '', password: '' });
    } catch (error) {
      alert('Invalid credentials');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setCurrentView('home');
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (selectedPost) {
        await axios.put(`${API_BASE_URL}/api/posts/${selectedPost.id}`, postForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_BASE_URL}/api/posts`, postForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      await loadPosts();
      resetPostForm();
      alert('Post saved successfully!');
    } catch (error) {
      alert('Error saving post');
    }
    setLoading(false);
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_BASE_URL}/api/posts/${postId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        await loadPosts();
        alert('Post deleted successfully!');
      } catch (error) {
        alert('Error deleting post');
      }
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/categories`, categoryForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadCategories();
      setCategoryForm({ name: '', description: '' });
      alert('Category created successfully!');
    } catch (error) {
      alert('Error creating category');
    }
    setLoading(false);
  };

  const resetPostForm = () => {
    setPostForm({
      title: '',
      content: '',
      category: '',
      image_url: '',
      published: true
    });
    setSelectedPost(null);
  };

  const editPost = (post) => {
    setPostForm({
      title: post.title,
      content: post.content,
      category: post.category,
      image_url: post.image_url,
      published: post.published
    });
    setSelectedPost(post);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const stripHtml = (html) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Rich text editor configuration - Simple textarea for now (more compatible)
  const handleContentChange = (value) => {
    setPostForm({...postForm, content: value});
  };

  // Login View
  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Bejelentkezés</h1>
            <p className="text-gray-600">Jelentkezzen be a blog kezeléséhez</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Felhasználónév</label>
              <input
                type="text"
                value={loginData.username}
                onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Jelszó</label>
              <input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-200 font-medium"
            >
              {loading ? 'Bejelentkezés...' : 'Bejelentkezés'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <button
              onClick={() => setCurrentView('home')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Vissza a bloghoz
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard View
  if (currentView === 'admin' && isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Admin Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">Blog Vezérlőpult</h1>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setCurrentView('home')}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Blog megtekintése
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Kijelentkezés
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Post Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  {selectedPost ? 'Bejegyzés szerkesztése' : 'Új bejegyzés létrehozása'}
                </h2>
                
                <form onSubmit={handlePostSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cím</label>
                    <input
                      type="text"
                      value={postForm.title}
                      onChange={(e) => setPostForm({...postForm, title: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kategória</label>
                    <select
                      value={postForm.category}
                      onChange={(e) => setPostForm({...postForm, category: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Válasszon kategóriát</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kiemelt kép URL</label>
                    <input
                      type="url"
                      value={postForm.image_url}
                      onChange={(e) => setPostForm({...postForm, image_url: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tartalom</label>
                    <textarea
                      value={postForm.content}
                      onChange={(e) => handleContentChange(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows="12"
                      required
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="published"
                      checked={postForm.published}
                      onChange={(e) => setPostForm({...postForm, published: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="published" className="ml-2 text-sm text-gray-700">
                      Közzétéve
                    </label>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
                    >
                      {loading ? 'Mentés...' : (selectedPost ? 'Bejegyzés frissítése' : 'Bejegyzés létrehozása')}
                    </button>
                    {selectedPost && (
                      <button
                        type="button"
                        onClick={resetPostForm}
                        className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 font-medium"
                      >
                        Szerkesztés megszakítása
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              
              {/* Category Management */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Kategória hozzáadása</h3>
                <form onSubmit={handleCreateCategory} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Kategória neve"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <textarea
                    placeholder="Leírás"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="2"
                  />
                  <button
                    type="submit"
                    className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                  >
                    Kategória hozzáadása
                  </button>
                </form>
              </div>

              {/* Posts List */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Legutóbbi bejegyzések</h3>
                <div className="space-y-3">
                  {posts.slice(0, 5).map((post) => (
                    <div key={post.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm">{post.title}</h4>
                        <p className="text-xs text-gray-500">{post.category}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => editPost(post)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Szerkesztés
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Törlés
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Public Blog View (Home)
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4">Személyes Blogom</h1>
            <p className="text-xl text-blue-100 mb-8">Gondolatok, történetek és megosztásra érdemes ötletek</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Featured Posts */}
        {posts.length > 0 && (
          <section className="mb-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {posts.slice(0, 2).map((post) => (
                <article key={post.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition duration-300">
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt={post.title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {post.category}
                      </span>
                      <span className="text-gray-500 text-sm ml-auto">
                        {formatDate(post.created_at)}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3 hover:text-blue-600 cursor-pointer">
                      {post.title}
                    </h2>
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {post.excerpt || stripHtml(post.content).substring(0, 150) + '...'}
                    </p>
                    <button className="text-blue-600 hover:text-blue-800 font-medium">
                      Tovább olvasom →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* All Posts */}
        <section>
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Latest Posts</h2>
          
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📝</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No posts yet</h3>
              <p className="text-gray-600">Start creating amazing content!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.slice(2).map((post) => (
                <article key={post.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition duration-300">
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt={post.title}
                      className="w-full h-40 object-cover"
                    />
                  )}
                  <div className="p-6">
                    <div className="flex items-center mb-3">
                      <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {post.category}
                      </span>
                      <span className="text-gray-500 text-sm ml-auto">
                        {formatDate(post.created_at)}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 hover:text-blue-600 cursor-pointer">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {post.excerpt || stripHtml(post.content).substring(0, 100) + '...'}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">My Personal Blog</h3>
            <p className="text-gray-400 mb-6">Built with React, FastAPI, and MongoDB</p>
            <button
              onClick={() => setCurrentView('login')}
              className="text-gray-500 hover:text-gray-300 text-xs underline transition duration-200"
            >
              Admin
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;