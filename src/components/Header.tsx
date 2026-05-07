function Header() {
  return (
    <div className="w-full h-16 border-b-2 border-gray-300 flex items-center justify-between bg-teal-600/10 text-black px-20 ">
      <div>
        <h1 className="text-2xl font-semibold text-center">ACO-Santé</h1>
      </div>
      <div>
        <button className="py-2 px-4 bg-teal-800 rounded-2xl text-white font-semibold shadow-md hover:bg-teal-700 transition-colors">
          Importer
        </button>
      </div>
    </div>
  );
}

export default Header;
