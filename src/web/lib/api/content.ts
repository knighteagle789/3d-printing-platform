import apiClient from '../api-client';

export const contentApi = {
  // Public
  getBlogPosts: (page = 1, pageSize = 9) =>
    apiClient.get(`/Content/blog?page=${page}&pageSize=${pageSize}`),
  getBlogPostBySlug: (slug: string) =>
    apiClient.get(`/Content/blog/${slug}`),
  getPortfolio: (page = 1, pageSize = 12) =>
    apiClient.get(`/Content/portfolio?page=${page}&pageSize=${pageSize}`),

  // Admin — Portfolio
  getPortfolioItem: (id: string) =>
    apiClient.get(`/Content/portfolio/${id}`),
  createPortfolioItem: (data: CreatePortfolioItemRequest) =>
    apiClient.post('/Content/portfolio', data),
  updatePortfolioItem: (id: string, data: UpdatePortfolioItemRequest) =>
    apiClient.put(`/Content/portfolio/${id}`, data),
  deletePortfolioItem: (id: string) =>
    apiClient.delete(`/Content/portfolio/${id}`),

  // Admin — Blog
  createBlogPost: (data: CreateBlogPostRequest) =>
    apiClient.post('/Content/blog', data),
  getBlogPostById: (id: string) =>
    apiClient.get(`/Content/blog/id/${id}`),
  updateBlogPost: (id: string, data: UpdateBlogPostRequest) =>
    apiClient.put(`/Content/blog/${id}`, data),
  deleteBlogPost: (id: string) =>
    apiClient.delete(`/Content/blog/${id}`),
  getAllBlogPosts: (page = 1, pageSize = 50) =>
    apiClient.get(`/Content/blog/all?page=${page}&pageSize=${pageSize}`),
};

export interface CreatePortfolioItemRequest {
  title: string;
  description: string;
  detailedDescription?: string;
  category: string;
  imageUrl: string;
  modelFileUrl?: string;
  timelapseVideoUrl?: string;
  tags?: string[];
  materialId?: string;
  projectDetails?: string;
  displayOrder: number;
  isFeatured: boolean;
  isPublished: boolean;
}

export interface UpdatePortfolioItemRequest {
  title?: string;
  description?: string;
  detailedDescription?: string;
  category?: string;
  imageUrl?: string;
  modelFileUrl?: string;
  timelapseVideoUrl?: string;
  tags?: string[];
  materialId?: string;
  projectDetails?: string;
  displayOrder?: number;
  isFeatured?: boolean;
  isPublished?: boolean;
}

export interface CreateBlogPostRequest {
  title: string;
  summary: string;
  content: string;
  featuredImageUrl?: string;
  category: string;
  tags?: string[];
  isPublished: boolean;
  publishedAt?: string;
}

export interface UpdateBlogPostRequest {
  title?: string;
  summary?: string;
  content?: string;
  featuredImageUrl?: string;
  category?: string;
  tags?: string[];
  isPublished?: boolean;
  publishedAt?: string;
}

