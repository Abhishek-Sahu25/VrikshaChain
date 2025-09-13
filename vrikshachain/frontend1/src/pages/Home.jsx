import React from 'react';
import Hero from '../components/Common/Hero';
import About from '../components/Common/About';
import './Home.css';

const Home = () => {
  return (
    <div className="home-page">
      <Hero />
      <About />
    </div>
  );
};

export default Home;