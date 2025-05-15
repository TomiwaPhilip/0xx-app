export interface Project {
  _id: string
  name: string
  description?: string
  imageUrl: string
  price: number
  percentChange: number
  category: string
  supportable: boolean
  location?: string
  organization?: string
  marketCap?: number
  creatorId: string
  comments: Comment[]
  createdAt: Date
  updatedAt: Date
  tokenAddress?: string
  tokenSymbol?: string
  initialSupply?: string
  currentSupply?: string
  tokenPrice?: string
  contentURI?: string
  poolAddress?: string
}

export interface User {
  _id: string
  privyId: string
  email?: string
  walletAddress?: string
  name?: string
  userType: "normal" | "business"
  twitterHandle?: string
  twitterFollowers?: number
  profileImage?: string
  coverImage?: string
  bio?: string
  supportedProjects: string[]
  createdProjects: string[]
  following: string[]
  followers: string[]
  supportsReceived: number
  notificationSettings?: {
    emailNotifications?: boolean
    supportNotifications?: boolean
    commentNotifications?: boolean
  }
  privacySettings?: {
    publicProfile?: boolean
    showSupporters?: boolean
  }
  createdAt: Date
  updatedAt: Date
}

export interface Comment {
  _id: string
  userId: string
  userName: string
  userImage?: string
  text: string
  createdAt: Date
}

export interface SupportTransaction {
  _id: string
  projectId: string
  userId: string
  userName: string
  action: "bought" | "sold"
  price: number
  createdAt: Date
}
