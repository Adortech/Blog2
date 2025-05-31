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
      alert('Érvénytelen hitelesítő adatok');
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
      alert('Bejegyzés sikeresen mentve!');
    } catch (error) {
      alert('Hiba a bejegyzés mentése során');
    }
    setLoading(false);
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm('Biztosan törölni szeretné ezt a bejegyzést?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_BASE_URL}/api/posts/${postId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        await loadPosts();
        alert('Bejegyzés sikeresen törölve!');
      } catch (error) {
        alert('Hiba a bejegyzés törlése során');
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
      alert('Kategória sikeresen létrehozva!');
    } catch (error) {
      alert('Hiba a kategória létrehozása során');
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
    return new Date(dateString).toLocaleDateString('hu-HU', {
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

  // Enhanced content processing for YouTube and HTML embeds
  const processContent = (content) => {
    if (!content) return '';
    
    let processedContent = content;
    
    // YouTube embed processing
    const youtubeRegex = /\[youtube:([a-zA-Z0-9_-]+)\]/g;
    processedContent = processedContent.replace(youtubeRegex, (match, videoId) => {
      return `<div class="video-container my-6">
        <iframe 
          width="100%" 
          height="315" 
          src="https://www.youtube.com/embed/${videoId}" 
          frameborder="0" 
          allowfullscreen
          class="rounded-lg shadow-lg"
        ></iframe>
      </div>`;
    });
    
    // HTML embed processing
    const htmlRegex = /\[html\](.*?)\[\/html\]/gs;
    processedContent = processedContent.replace(htmlRegex, (match, htmlContent) => {
      return `<div class="html-embed my-4 p-4 border border-gray-200 rounded-lg bg-gray-50">${htmlContent}</div>`;
    });
    
    return processedContent;
  };

  // Rich text editor helpers
  const insertYouTubeEmbed = () => {
    const videoId = prompt('Adja meg a YouTube videó ID-t:');
    if (videoId) {
      const embedCode = `[youtube:${videoId}]`;
      setPostForm({...postForm, content: postForm.content + '\n' + embedCode});
    }
  };

  const insertHtmlEmbed = () => {
    const htmlCode = prompt('Adja meg a HTML kódot:');
    if (htmlCode) {
      const embedCode = `[html]${htmlCode}[/html]`;
      setPostForm({...postForm, content: postForm.content + '\n' + embedCode});
    }
  };

  const handleContentChange = (value) => {
    setPostForm({...postForm, content: value});
  };

  // Login View
  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Jelszó</label>
              <input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition duration-200 font-medium transform hover:scale-105"
            >
              {loading ? 'Bejelentkezés...' : 'Bejelentkezés'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <button
              onClick={() => setCurrentView('home')}
              className="text-blue-600 hover:text-blue-800 font-medium transition duration-200"
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Admin Header */}
        <header className="bg-white shadow-lg border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg mr-3 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Blog Vezérlőpult</h1>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setCurrentView('home')}
                  className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition duration-200"
                >
                  <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Blog megtekintése
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-2 rounded-lg hover:from-red-600 hover:to-red-700 transition duration-200 transform hover:scale-105"
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
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="flex items-center mb-8">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg mr-3 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedPost ? 'Bejegyzés szerkesztése' : 'Új bejegyzés létrehozása'}
                  </h2>
                </div>
                
                <form onSubmit={handlePostSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cím</label>
                    <input
                      type="text"
                      value={postForm.title}
                      onChange={(e) => setPostForm({...postForm, title: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition duration-200"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kategória</label>
                    <select
                      value={postForm.category}
                      onChange={(e) => setPostForm({...postForm, category: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition duration-200"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition duration-200"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Tartalom</label>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={insertYouTubeEmbed}
                          className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition duration-200"
                        >
                          📺 YouTube
                        </button>
                        <button
                          type="button"
                          onClick={insertHtmlEmbed}
                          className="px-3 py-1 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600 transition duration-200"
                        >
                          📝 HTML
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={postForm.content}
                      onChange={(e) => handleContentChange(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition duration-200"
                      rows="15"
                      placeholder="Írja ide a bejegyzés tartalmát...

📺 YouTube videó beágyazása: [youtube:VIDEO_ID]
📝 HTML kód beágyazása: [html]HTML kód itt[/html]"
                      required
                    />
                    <div className="mt-2 text-sm text-gray-500">
                      <p className="mb-1"><strong>Tippek:</strong></p>
                      <p>• YouTube: [youtube:dQw4w9WgXcQ]</p>
                      <p>• HTML: [html]&lt;button&gt;Kattintson ide&lt;/button&gt;[/html]</p>
                    </div>
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
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 font-medium transition duration-200 transform hover:scale-105"
                    >
                      {loading ? 'Mentés...' : (selectedPost ? 'Bejegyzés frissítése' : 'Bejegyzés létrehozása')}
                    </button>
                    {selectedPost && (
                      <button
                        type="button"
                        onClick={resetPostForm}
                        className="bg-gray-600 text-white px-6 py-3 rounded-xl hover:bg-gray-700 font-medium transition duration-200"
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
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <div className="flex items-center mb-4">
                  <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-teal-500 rounded mr-3 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Kategória hozzáadása</h3>
                </div>
                <form onSubmit={handleCreateCategory} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Kategória neve"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition duration-200"
                    required
                  />
                  <textarea
                    placeholder="Leírás"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition duration-200"
                    rows="2"
                  />
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-2 rounded-lg hover:from-green-600 hover:to-teal-600 transition duration-200 transform hover:scale-105"
                  >
                    Kategória hozzáadása
                  </button>
                </form>
              </div>

              {/* Posts List */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <div className="flex items-center mb-4">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded mr-3 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Legutóbbi bejegyzések</h3>
                </div>
                <div className="space-y-3">
                  {posts.slice(0, 5).map((post) => (
                    <div key={post.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl hover:from-gray-100 hover:to-blue-100 transition duration-200">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm">{post.title}</h4>
                        <p className="text-xs text-gray-500">{post.category}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => editPost(post)}
                          className="text-blue-600 hover:text-blue-800 text-sm hover:bg-blue-100 px-2 py-1 rounded transition duration-200"
                        >
                          Szerkesztés
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="text-red-600 hover:text-red-800 text-sm hover:bg-red-100 px-2 py-1 rounded transition duration-200"
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
      <header className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-6xl font-bold mb-6 animate-fade-in">Személyes Blogom</h1>
            <p className="text-2xl text-blue-100 mb-8 max-w-2xl mx-auto">Gondolatok, történetek és megosztásra érdemes ötletek</p>
            <div className="flex justify-center space-x-4">
              <div className="w-20 h-1 bg-white rounded-full"></div>
              <div className="w-20 h-1 bg-blue-200 rounded-full"></div>
              <div className="w-20 h-1 bg-purple-200 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Featured Posts */}
        {posts.length > 0 && (
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Kiemelt Bejegyzések</h2>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {posts.slice(0, 2).map((post) => (
                <article key={post.id} className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition duration-500 transform hover:-translate-y-2 border border-gray-100">
                  {post.image_url && (
                    <div className="relative overflow-hidden">
                      <img
                        src={post.image_url}
                        alt={post.title}
                        className="w-full h-56 object-cover transform hover:scale-105 transition duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black opacity-30"></div>
                    </div>
                  )}
                  <div className="p-8">
                    <div className="flex items-center mb-6">
                      <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                        {post.category}
                      </span>
                      <span className="text-gray-500 text-sm ml-auto flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(post.created_at)}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 hover:text-blue-600 cursor-pointer transition duration-200">
                      {post.title}
                    </h2>
                    <div className="text-gray-600 mb-6 line-clamp-3" dangerouslySetInnerHTML={{
                      __html: post.excerpt || processContent(post.content).substring(0, 150) + '...'
                    }} />
                    <button className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium group transition duration-200">
                      Tovább olvasom 
                      <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* All Posts */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Legfrissebb bejegyzések</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-green-500 to-teal-500 mx-auto rounded-full"></div>
          </div>
          
          {posts.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-gray-400 text-8xl mb-6">📝</div>
              <h3 className="text-2xl font-medium text-gray-900 mb-4">Még nincsenek bejegyzések</h3>
              <p className="text-gray-600 text-lg">Kezdje el a fantasztikus tartalom létrehozását!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.slice(2).map((post) => (
                <article key={post.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition duration-300 transform hover:-translate-y-1 border border-gray-100">
                  {post.image_url && (
                    <div className="relative overflow-hidden">
                      <img
                        src={post.image_url}
                        alt={post.title}
                        className="w-full h-48 object-cover transform hover:scale-105 transition duration-300"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                        {post.category}
                      </span>
                      <span className="text-gray-500 text-sm ml-auto">
                        {formatDate(post.created_at)}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3 hover:text-blue-600 cursor-pointer transition duration-200">
                      {post.title}
                    </h3>
                    <div className="text-gray-600 text-sm line-clamp-2" dangerouslySetInnerHTML={{
                      __html: post.excerpt || stripHtml(processContent(post.content)).substring(0, 100) + '...'
                    }} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-900 to-black text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Személyes Blogom</h3>
            <p className="text-gray-400 mb-8 text-lg">React, FastAPI és MongoDB technológiákkal építve</p>
            <button
              onClick={() => setCurrentView('login')}
              className="text-gray-500 hover:text-gray-300 text-xs underline transition duration-200 opacity-50 hover:opacity-100"
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