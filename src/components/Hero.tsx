import emergencyVoiture from "../assets/emergency-ambulance.png";

function Hero() {
  return (
    <div className="w-full flex items-center justify-center gap-4 py-24">
      <div className="w-full text-left flex-col items-start justify-start">
        <h1 className="text-6xl font-bold text-left text-teal-800">
          Déploiement d&apos;unités mobiles en contexte épidémique
        </h1>
        <p className=" pt-4 text-lg text-gray-700">
          Objectifs optimises par MOACO: minimiser le temps total et maximiser
          la couvrance sanitaire.
        </p>
      </div>
      <div className="w-full flex items-center justify-center">
        <img
          src={emergencyVoiture}
          alt="Emergency Ambulance"
          className="w-80 h-80 object-cover"
        />
      </div>
    </div>
  );
}

export default Hero;
