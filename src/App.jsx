import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Navbar from './components/Navbar'
import SkipLink from './components/SkipLink'
import RouteTitle from './components/RouteTitle'
import ScrollToTop from './components/ScrollToTop'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import PostPage from './pages/PostPage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import NewPost from './pages/NewPost'
import EditPost from './pages/EditPost'
import ChannelDirectory from './pages/ChannelDirectory'
import ChannelPage from './pages/ChannelPage'
import StaticPage from './pages/StaticPage'
import MembershipPage from './membership/MembershipPage'
import WelcomePage from './membership/WelcomePage'
import MyPassesPage from './membership/MyPassesPage'
import ChangePassesPage from './membership/ChangePassesPage'
import AtlasPage from './atlas/AtlasPage'
import TestersPage from './testers/TestersPage'
import Footer from './components/Footer'
import { useOwnerCheck } from './admin/useIsOwner'
import ProductGallery from './pages/ProductGallery'
import ProductPage from './pages/ProductPage'
import NewProduct from './pages/NewProduct'
import AdminConsole from './admin/AdminConsole'
import OpenDoors from './admin/OpenDoors'
import AdminSuggestions from './admin/AdminSuggestions'
import AdminComments from './admin/AdminComments'
import AdminBooks from './admin/AdminBooks'
import AdminNewsletter from './admin/AdminNewsletter'
import { NewsletterConfirmPage, NewsletterUnsubscribePage } from './newsletter/NewsletterLinkPage'
import AdminStories from './admin/AdminStories'
import AdminPosts from './admin/AdminPosts'
import AdminHome from './admin/AdminHome'
import AdminMembers from './admin/AdminMembers'
import AdminPromotions from './admin/AdminPromotions'
import AdminBackup from './admin/AdminBackup'
import ArtLoftRoutes from './artloft/ArtLoftRoutes'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import FactoryFloorRoutes from './factoryfloor/FactoryFloorRoutes'
import CartPage from './cart/CartPage'
import CheckoutSuccess from './cart/CheckoutSuccess'
import InvoicePage from './invoice/InvoicePage'
import DraftingDeskRoutes from './draftingdesk/DraftingDeskRoutes'
import RoomRoutes from './rooms/RoomRoutes'
import NotFound from './pages/NotFound'
import PageLoading from './components/PageLoading'
import ErrorBoundary from './components/ErrorBoundary'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const { owner } = useOwnerCheck(session) // the owner sees unfinished pages as drafts, and the footer links to them

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) return <div className="container"><PageLoading /></div>

  return (
    <>
      <SkipLink />
      <RouteTitle />
      <ScrollToTop />
      <Navbar session={session} />
      <div className="container" id="main-content" tabIndex={-1}>
        <ErrorBoundary>
        <Routes>
         <Route path="/" element={<ChannelDirectory />} /> 
<Route path="/blog" element={<Home />} /> 
<Route path="/channel/:slug" element={<ChannelPage />} />
<Route path="/post/:id" element={<PostPage session={session} />} />
<Route path="/page/:slug" element={<StaticPage owner={owner} />} /> 
<Route path="/testers" element={<TestersPage />} />
<Route path="/membership" element={<MembershipPage owner={owner} session={session} />} />
<Route path="/newsletter/confirm" element={<NewsletterConfirmPage />} />
<Route path="/newsletter/unsubscribe" element={<NewsletterUnsubscribePage />} />
<Route path="/membership/welcome" element={ <ProtectedRoute session={session}> <WelcomePage /> </ProtectedRoute> } />
<Route path="/membership/passes" element={ <ProtectedRoute session={session}> <MyPassesPage owner={owner} /> </ProtectedRoute> } />
<Route path="/membership/atlas" element={ <ProtectedRoute session={session}> <AtlasPage /> </ProtectedRoute> } />
<Route path="/membership/change" element={ <ProtectedRoute session={session}> <ChangePassesPage owner={owner} /> </ProtectedRoute> } />
<Route path="/products" element={<ProductGallery />} /> 
<Route path="/products/:id" element={<ProductPage />} /> 
<Route path="/new-product" element={ <ProtectedRoute session={session}> <NewProduct session={session} /> </ProtectedRoute> } />
<Route path="/admin" element={ <ProtectedRoute session={session}> <AdminConsole session={session} /> </ProtectedRoute> } />
<Route path="/admin/doors" element={ <ProtectedRoute session={session}> <OpenDoors session={session} /> </ProtectedRoute> } />
<Route path="/admin/suggestions" element={ <ProtectedRoute session={session}> <AdminSuggestions session={session} /> </ProtectedRoute> } />
<Route path="/admin/comments" element={ <ProtectedRoute session={session}> <AdminComments session={session} /> </ProtectedRoute> } />
<Route path="/admin/books" element={ <ProtectedRoute session={session}> <AdminBooks session={session} /> </ProtectedRoute> } />
<Route path="/admin/newsletter" element={ <ProtectedRoute session={session}> <AdminNewsletter session={session} /> </ProtectedRoute> } />
<Route path="/admin/stories" element={ <ProtectedRoute session={session}> <AdminStories session={session} /> </ProtectedRoute> } />
<Route path="/admin/posts" element={ <ProtectedRoute session={session}> <AdminPosts session={session} /> </ProtectedRoute> } />
<Route path="/admin/home" element={ <ProtectedRoute session={session}> <AdminHome session={session} /> </ProtectedRoute> } />
<Route path="/admin/members" element={ <ProtectedRoute session={session}> <AdminMembers session={session} /> </ProtectedRoute> } />
<Route path="/admin/promotions" element={ <ProtectedRoute session={session}> <AdminPromotions session={session} /> </ProtectedRoute> } />
<Route path="/admin/backup" element={ <ProtectedRoute session={session}> <AdminBackup session={session} /> </ProtectedRoute> } />
          <Route
            path="/new"
            element={
              <ProtectedRoute session={session}>
                <NewPost session={session} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit/:id"
            element={
              <ProtectedRoute session={session}>
                <EditPost session={session} />
              </ProtectedRoute>
            }
          />
          <Route path="/art-loft/*" element={<ArtLoftRoutes />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/factory-floor/*" element={<FactoryFloorRoutes />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/invoice" element={<InvoicePage />} />
          <Route path="/drafting-desk/*" element={<DraftingDeskRoutes />} />
          <Route path="/idea-hatchery/*" element={<RoomRoutes room="idea-hatchery" />} />
          <Route path="/leadership-lounge/*" element={<RoomRoutes room="leadership-lounge" />} />
          <Route path="/explorers-bay/*" element={<RoomRoutes room="explorers-bay" />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/knowledge-nook/*" element={<RoomRoutes room="knowledge-nook" />} />
          <Route path="/sarah-jrs-den/*" element={<RoomRoutes room="sarah-jrs-den" />} />
        </Routes>
        </ErrorBoundary>
      </div>
<Footer owner={owner} /> 
    </>
  )
}
