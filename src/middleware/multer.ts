import multer from "multer";

 const storage = multer.memoryStorage();
 const uploadImage = multer({storage});
 
 export default uploadImage;