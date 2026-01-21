import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from '../components/Layout'
import StockBrowser from '../components/guest/StockBrowser'
import MyRequests from '../components/guest/MyRequests'
import MyItems from '../components/guest/MyItems'

const GuestDashboard: React.FC = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<StockBrowser />} />
        <Route path="/requests" element={<MyRequests />} />
        <Route path="/my-items" element={<MyItems />} />
      </Routes>
    </Layout>
  )
}

export default GuestDashboard
