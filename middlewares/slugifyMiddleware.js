import slugify from "slugify";

export const generateSlug = (req, res, next) => {
  if (req.body && req.body.name) {
    req.body.slug = slugify(req.body.name, { lower: true });
  }
  next();
};