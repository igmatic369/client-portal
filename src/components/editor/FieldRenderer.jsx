import TextField from '../fields/TextField'
import TextareaField from '../fields/TextareaField'
import EmailField from '../fields/EmailField'
import PhoneField from '../fields/PhoneField'
import CurrencyField from '../fields/CurrencyField'
import UrlField from '../fields/UrlField'
import ToggleField from '../fields/ToggleField'
import SelectField from '../fields/SelectField'
import StarsField from '../fields/StarsField'
import HoursGridField from '../fields/HoursGridField'
import ListField from '../fields/ListField'
import SimpleListField from '../fields/SimpleListField'
import ImageGalleryField from '../fields/ImageGalleryField'
import ImageSingleField from '../fields/ImageSingleField'

export default function FieldRenderer({ field, value, onChange, siteSlug }) {
  const props = { field, value, onChange }

  switch (field.type) {
    case 'text':          return <TextField {...props} />
    case 'textarea':      return <TextareaField {...props} />
    case 'email':         return <EmailField {...props} />
    case 'phone':         return <PhoneField {...props} />
    case 'currency':      return <CurrencyField {...props} />
    case 'url':           return <UrlField {...props} />
    case 'toggle':        return <ToggleField {...props} />
    case 'select':        return <SelectField {...props} />
    case 'stars':         return <StarsField {...props} />
    case 'hours':         return <HoursGridField {...props} />
    case 'simple_list':   return <SimpleListField {...props} />
    case 'image_gallery': return <ImageGalleryField {...props} siteSlug={siteSlug} />
    case 'image':         return <ImageSingleField {...props} siteSlug={siteSlug} />
    case 'list':
      return (
        <ListField
          {...props}
          FieldRenderer={FieldRenderer}
        />
      )
    default:
      return <TextField {...props} />
  }
}
