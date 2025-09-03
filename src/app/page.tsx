'use client';

import React from 'react';

// import CtaSection from './sections/CtaSection';
// import AppsSection from './sections/AppsSection';
// import PhilosophySection from './sections/PhilosophySection';

// import './globals.css';
import AiBusinessQuizSection from './sections/AiBusinessQuizSection';
import HeroSection from './sections/HeroSection';
import OpenSourceSection from './sections/OpenSourceSection';

const LandingPage = () => {
    // Smooth scroll handler
    const handleArrowClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        // const appsSection = document.getElementById('apps');
        const appsSection = document.getElementById('ai-business-quiz');
        if (appsSection) {
            appsSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div>
            <HeroSection onArrowClick={handleArrowClick} />
            {/*
            <AppsSection />
            <PhilosophySection />
            */}
            <AiBusinessQuizSection />
            <OpenSourceSection />
            {/* <CtaSection /> */}
        </div>
    );
};

export default LandingPage;
