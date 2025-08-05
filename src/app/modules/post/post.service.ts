import { prisma } from "../../../utils/prisma";
import { getFileUrl } from "../../helper/uploadFile";

const createPostInDb = async (postData: any, files: any) => {
  const video = await getFileUrl(files.video?.[0]) || null;
  const image = files.image?.[0]?.location || null;

    const result = await prisma.post.create({
       data: {
         ...postData,
         image,
         video,
       },
    });

  return "Success";
};


// const getMyPos

export const postService = {
  createPostInDb,
};
